"use client";

import React from "react";
import { CursorStateProvider } from "./CursorStateProvider";
import DocumentBlock from "./blocks/DocumentBlock";
import { DocumentProvider } from "./DocumentProvider";

type Props = {
  // empty props
};

const PromptTextEditor = (props: Props) => {
  return (
    <CursorStateProvider>
      <DocumentProvider>
        <DocumentBlock />
      </DocumentProvider>
    </CursorStateProvider>
  );
};

export default PromptTextEditor;
