"use client";

import React from "react";
import { CursorStateProvider } from "./CursorStateProvider";
import DocumentBlock from "./blocks/DocumentBlock";
import { DocumentProvider } from "./DocumentProvider";
import WordPositionInfoProvider from "./WordPositionInfoProvder";
import EditorModeContextProvider from "./EditorModeContext";
import SentenceDraggingContextProvider from "./SentenceDraggingContext";

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
            <SentenceDraggingContextProvider>
              <DocumentBlock isActive={isActive} />
            </SentenceDraggingContextProvider>
          </CursorStateProvider>
        </WordPositionInfoProvider>
      </DocumentProvider>
    </EditorModeContextProvider>
  );
};

export default PromptTextEditor;
