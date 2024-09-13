"use client";

import React from "react";
import { CursorStateProvider } from "./CursorStateProvider";
import DocumentBlock from "./blocks/DocumentBlock";
import { DocumentProvider } from "./DocumentProvider";
import WordPositionInfoProvider from "./WordPositionInfoProvder";
import EditorModeContextProvider from "./EditorModeContext";

type Props = {
  isActive: boolean;
  promptText: string;
  onPromptTextUpdate: (latest: string) => void;
};

const PromptTextEditor = ({
  isActive,
  promptText,
  onPromptTextUpdate,
}: Props) => {
  return (
    <EditorModeContextProvider>
      <DocumentProvider
        promptText={promptText}
        onPromptTextUpdate={onPromptTextUpdate}
      >
        <WordPositionInfoProvider>
          <CursorStateProvider isActive={isActive}>
            <DocumentBlock isActive={isActive} />
          </CursorStateProvider>
        </WordPositionInfoProvider>
      </DocumentProvider>
    </EditorModeContextProvider>
  );
};

export default PromptTextEditor;
