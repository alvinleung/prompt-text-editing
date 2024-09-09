"use client";

import React from "react";
import { CursorStateProvider } from "./CursorStateProvider";
import DocumentBlock from "./blocks/DocumentBlock";
import { DocumentProvider } from "./DocumentProvider";
import WordPositionInfoProvider from "./WordPositionInfoProvder";
import EditorModeContextProvider from "./EditorModeContext";

type Props = {
  // empty props
};

const PromptTextEditor = (props: Props) => {
  return (
    <WordPositionInfoProvider>
      <EditorModeContextProvider>
        <DocumentProvider>
          <CursorStateProvider>
            <DocumentBlock />
          </CursorStateProvider>
        </DocumentProvider>
      </EditorModeContextProvider>
    </WordPositionInfoProvider>
  );
};

export default PromptTextEditor;
