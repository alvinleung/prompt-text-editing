import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { ParagraphBlock } from "./ParagraphBlock";
import {
  convertDocumentToString,
  getWordPositionFromRawTextSelection,
  useDocument,
} from "../DocumentProvider";
import {
  getPrecisionName,
  getSelectionPrecision,
  Precision,
  useCursorState,
} from "../CursorStateProvider";
import { useEditorMode } from "../EditorModeContext";
import { useHotkeys } from "react-hotkeys-hook";
import { useEventListener } from "usehooks-ts";
import { useCreateVariation } from "@/components/ProjectWorkspace/ProjectWorkspace";
import { SelectionIcon } from "../SelectionIcon";

type Props = {};

const DocumentBlock = (props: Props) => {
  const { document, updateDocument, rawText } = useDocument();

  const {
    selectionLevel,
    setPosition,
    inputMode,
    selectionRange,
    setSelectionRange,
  } = useCursorState();
  const { editorMode, setEditorMode } = useEditorMode();

  const [editorContent, setEditorContent] = useState(rawText);
  const editorTextAreaRef = useRef() as MutableRefObject<HTMLTextAreaElement>;

  useEffect(() => {
    // apply text when exiting edit mode
    if (editorMode !== "edit") {
      // update document
      updateDocument(editorContent);
      // update selection
      const rawTextSelectionWordPosition = getWordPositionFromRawTextSelection(
        editorContent,
        editorTextAreaRef.current.selectionStart,
        editorTextAreaRef.current.selectionEnd,
      );
      rawTextSelectionWordPosition.to &&
        setPosition(rawTextSelectionWordPosition.to);
      setSelectionRange(rawTextSelectionWordPosition || null);
    }
  }, [editorMode, editorContent]);

  const { createVariation, variations } = useCreateVariation();
  // select text when entering selection mode
  useEffect(() => {
    if (editorMode === "edit" && selectionRange !== null) {
      variations.length === 1 && createVariation();
      const { selectionBegin, selectionEnd } = convertDocumentToString(
        document,
        selectionRange,
      );
      editorTextAreaRef.current.focus();
      // console.log(JSON.stringify(result));
      editorTextAreaRef.current.setSelectionRange(selectionBegin, selectionEnd);
    }
  }, [document, editorMode, selectionRange, variations]);

  useEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        setEditorMode("select");
      }
    },
    editorTextAreaRef,
  );

  const keyboardShortcutStyle =
    "inline-block p-1 rounded-md border border-zinc-500 text-zinc-200 text-[10px]";

  return (
    <div className="relative p-4 select-none text-[14px] mx-auto leading-none tracking-normal">
      <div
        style={{
          visibility: editorMode === "select" ? "visible" : "hidden",
        }}
      >
        {document.map((paragraph, index) => (
          <ParagraphBlock
            content={paragraph}
            position={{ paragraph: index }}
            key={index}
          />
        ))}
      </div>
      <div className="fixed text-[14px] bottom-0 left-0 right-0 opacity-80">
        <div className="text-zinc-200 flex items-center gap-4 flex-row mx-auto w-[65ch] p-4">
          <div className="flex flex-row gap-1 pr-4 border-r border-r-zinc-700">
            {editorMode === "edit" ? (
              "Editing"
            ) : (
              <>
                <SelectionIcon />
                {`${selectionRange && inputMode !== "mouse" ? getPrecisionName(getSelectionPrecision(selectionRange)) : getPrecisionName(selectionLevel)}`}
              </>
            )}
          </div>
          <div
            className={`${
              editorMode === "edit" ||
              selectionRange ||
              (selectionRange &&
                getSelectionPrecision(selectionRange) === Precision.SENTENCE)
                ? "opacity-100"
                : "opacity-0"
            }`}
          >
            <span className="text-zinc-200 flex items-center gap-1">
              <span className={keyboardShortcutStyle}>Esc</span>
              {editorMode === "edit" ? "Exit" : "Deselect"}
            </span>
          </div>
          <div
            className={`flex items-center gap-1 ${selectionRange && editorMode !== "edit" ? "opacity-100" : "opacity-0"}`}
          >
            <span className={keyboardShortcutStyle}>⌘ /</span> Comment
          </div>
        </div>
      </div>
      <textarea
        ref={editorTextAreaRef}
        style={{
          display: editorMode === "edit" ? "block" : "none",
        }}
        onChange={(e) => setEditorContent(e.target.value)}
        className="outline-none p-4 leading-[22px] absolute bg-transparent top-0 left-0 right-0 h-[120%]"
      >
        {editorContent}
      </textarea>
    </div>
  );
};

export default DocumentBlock;
