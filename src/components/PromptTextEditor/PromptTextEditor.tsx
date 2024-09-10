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
    <EditorModeContextProvider>
      <DocumentProvider>
        <WordPositionInfoProvider>
          <CursorStateProvider>
            <DocumentBlock />
          </CursorStateProvider>
        </WordPositionInfoProvider>
      </DocumentProvider>
    </EditorModeContextProvider>
  );
};

export default PromptTextEditor;
