# BoatBoard Local Preview

This folder is a self-contained Windows preview of BoatBoard. It contains no company instance data and does not require Python to be installed.

## Start

1. Double-click `BoatBoard.exe` to open the read-only viewer.
2. Double-click `BoatBoard Editor.cmd` to open the local editor.
3. Use `Stop BoatBoard.cmd` when you want to stop the local BoatBoard server.

BoatBoard starts invisibly, selects an available local address beginning at `http://127.0.0.1:4173/`, and opens the correct page automatically. Opening either viewer or editor again reuses the same running local instance.

The complete folder is portable. Stop BoatBoard before moving it, move the whole folder, and then launch `BoatBoard.exe` from the new location. Its local data moves with the folder.

The automatically opened `127.0.0.1` address is available only on that computer. Real-phone testing requires intentionally launching the server on the computer's current LAN address and opening that LAN address from a phone on the same Wi-Fi. LAN mode is not persistent and exposes the local board to other reachable devices, so use it only on an appropriate trusted network.

## Local Data

On first start, BoatBoard creates `project/private_instance/` inside this folder. That directory contains the complete local board:

- `boatboard.xlsx`: board name, teams, and colleagues.
- `board.json`: placement, ordering, rotation, and leadership connections.
- `images/`: optional profile images.

Do not share this folder after entering real company data. The source repository ignores `private_instance/`, but a copied local preview contains its own private data after first use.

For the current MVP, use the editor to create teams and colleagues and arrange the board. Image upload, profile descriptions, online forms, authentication, and hosting integration are intentionally deferred.
