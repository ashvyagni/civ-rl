"""FastAPI server with WebSocket endpoint for the AI Civilizations simulation."""

from __future__ import annotations

import asyncio
import json
import os
import sys

import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Ensure local modules are importable regardless of cwd
sys.path.insert(0, os.path.dirname(__file__))

from simulation import Simulation  # noqa: E402

# Singleton simulation (no seed → fresh random each run)
sim = Simulation()

# Connected WebSocket clients
_clients: set[WebSocket] = set()


async def _broadcast(data: dict) -> None:
    message = json.dumps(data)
    dead: set[WebSocket] = set()
    for ws in list(_clients):  # snapshot prevents "set changed size during iteration"
        try:
            await ws.send_text(message)
        except Exception:
            dead.add(ws)
    _clients.difference_update(dead)


async def _simulation_loop() -> None:
    """Background coroutine: tick the simulation at sim.tick_interval seconds."""
    while True:
        await asyncio.sleep(sim.tick_interval)
        if _clients:
            state = sim.step()
            await _broadcast(state)


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_simulation_loop())
    yield


app = FastAPI(title="AI Civilizations Simulation Server", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws/simulate")
async def ws_endpoint(websocket: WebSocket) -> None:
    await websocket.accept()
    _clients.add(websocket)

    # Send current state immediately on connection
    try:
        await websocket.send_text(json.dumps(sim._build_state()))
    except Exception:
        _clients.discard(websocket)
        return

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                cmd = json.loads(raw)
            except json.JSONDecodeError:
                continue

            result = sim.apply_command(cmd)
            state = sim._build_state()
            state["command_result"] = result
            await _broadcast(state)

    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)


@app.get("/ws/healthz")
async def health() -> dict:
    return {
        "status": "ok",
        "step": sim.step_number,
        "paused": sim.paused,
        "game_state": sim.game_state,
        "clients": len(_clients),
    }


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
