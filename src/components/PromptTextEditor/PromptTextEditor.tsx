"use client";

import React from "react";
import { CursorStateProvider } from "./CursorStateProvider";
import DocumentBlock from "./blocks/DocumentBlock";
import { DocumentProvider } from "./DocumentProvider";
import WordPositionInfoProvider from "./WordPositionInfoProvder";

type Props = {
  // empty props
};

const PromptTextEditor = (props: Props) => {
  return (
    <WordPositionInfoProvider>
      <DocumentProvider>
        <CursorStateProvider>
          <DocumentBlock />
        </CursorStateProvider>
      </DocumentProvider>
    </WordPositionInfoProvider>
  );
};

export default PromptTextEditor;
