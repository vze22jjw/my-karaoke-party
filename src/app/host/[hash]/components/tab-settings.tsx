"use client";

import { type VideoInPlaylist } from "~/types/app-types";
import { type IdleMessage } from "@prisma/client";
import { SettingsLinks } from "./settings/settings-links";
import { SettingsStatus } from "./settings/settings-status";
import { SettingsSuggestions } from "./settings/settings-suggestions";
import { SettingsIdleMessages } from "./settings/settings-idle-messages";
import { SettingsRules } from "./settings/settings-rules";
import { SettingsSpotify } from "./settings/settings-spotify";
import { SettingsSearch } from "./settings/settings-search";
import { SettingsExport } from "./settings/settings-export";
import { SettingsDangerZone } from "./settings/settings-danger-zone";

type ExtendedVideo = VideoInPlaylist & { spotifyId?: string | null };

type Props = {
  partyHash: string;
  partyName: string;
  useQueueRules: boolean;
  onToggleRules: () => void;
  disablePlayback: boolean;
  onTogglePlayback: () => void;
  maxSearchResults: number;
  onSetMaxResults: (value: number) => void;
  onCloseParty: () => void;
  isConfirmingClose: boolean;
  onConfirmClose: () => void;
  onCancelClose: () => void;
  playedPlaylist: ExtendedVideo[];
  partyStatus: string;
  onStartParty: () => void;
  onToggleIntermission: () => void;
  hostName: string | null;
  hostIdleMessages: IdleMessage[];
  onAddIdleMessage: (vars: { hostName: string; message: string }) => void;
  onDeleteIdleMessage: (vars: { id: number }) => void;
  onSyncIdleMessages: (messages: string[]) => void;
  themeSuggestions: string[];
  onUpdateThemeSuggestions: (suggestions: string[]) => void;
  spotifyPlaylistId: string | null;
};

export function TabSettings({
  partyHash,
  partyName,
  useQueueRules,
  onToggleRules,
  disablePlayback,
  onTogglePlayback,
  maxSearchResults,
  onSetMaxResults,
  onCloseParty,
  isConfirmingClose,
  onConfirmClose,
  onCancelClose,
  playedPlaylist,
  partyStatus,
  onStartParty,
  onToggleIntermission,
  hostName,
  hostIdleMessages,
  onAddIdleMessage,
  onDeleteIdleMessage,
  onSyncIdleMessages,
  themeSuggestions,
  onUpdateThemeSuggestions,
  spotifyPlaylistId,
}: Props) {
  return (
    <div className="space-y-4">
      <SettingsLinks partyHash={partyHash} />

      <SettingsStatus
        partyStatus={partyStatus}
        playedPlaylist={playedPlaylist}
        onStartParty={onStartParty}
        onToggleIntermission={onToggleIntermission}
      />

      <SettingsSuggestions
        themeSuggestions={themeSuggestions}
        onUpdateThemeSuggestions={onUpdateThemeSuggestions}
      />

      <SettingsIdleMessages
        hostName={hostName}
        hostIdleMessages={hostIdleMessages}
        onAddIdleMessage={onAddIdleMessage}
        onDeleteIdleMessage={onDeleteIdleMessage}
        onSyncIdleMessages={onSyncIdleMessages}
      />

      <SettingsRules
        useQueueRules={useQueueRules}
        onToggleRules={onToggleRules}
        disablePlayback={disablePlayback}
        onTogglePlayback={onTogglePlayback}
      />

      <SettingsSpotify
        partyHash={partyHash}
        spotifyPlaylistId={spotifyPlaylistId}
      />

      <SettingsSearch
        maxSearchResults={maxSearchResults}
        onSetMaxResults={onSetMaxResults}
      />

      <SettingsExport
        partyName={partyName}
        playedPlaylist={playedPlaylist}
      />

      <SettingsDangerZone
        onCloseParty={onCloseParty}
        isConfirmingClose={isConfirmingClose}
        onConfirmClose={onConfirmClose}
        onCancelClose={onCancelClose}
      />
    </div>
  );
}
