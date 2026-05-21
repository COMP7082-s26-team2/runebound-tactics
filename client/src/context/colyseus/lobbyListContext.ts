"use client";

import { createLobbyContext } from "@colyseus/react";
import type { LobbyState } from "@runebound-tactics/shared";

export const {
  LobbyProvider: LobbyListProvider,
  useLobby: useLobbyList,
} = createLobbyContext<LobbyState>();