import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { ParagraphBlock } from "./ParagraphBlock";
import {
  convertDocumentToString,
  getWordPositionFromRawTextSelection,
  useDocument,
} from "../DocumentProvider";
import {
  getPrecisionName,
  Precision,
  useCursorState,
} from "../CursorStateProvider";
import { useEditorMode } from "../EditorModeContext";
import { useHotkeys } from "react-hotkeys-hook";
import { useEventListener } from "usehooks-ts";
import { useCreateVariation } from "@/components/ProjectWorkspace/ProjectWorkspace";

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

      const { result, selection, selectionBegin, selectionEnd } =
        convertDocumentToString(document, selectionRange);
      editorTextAreaRef.current.focus();
      // console.log(JSON.stringify(result));
      editorTextAreaRef.current.setSelectionRange(selectionBegin, selectionEnd);
    }
  }, [document, editorMode, selectionRange]);

  useEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        setEditorMode("select");
      }
    },
    editorTextAreaRef,
  );

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
      <div className="fixed p-4 mx-auto bottom-0 left-0 right-0 opacity-50">
        <div className="mx-auto min-w-[56ch]">
          {getPrecisionName(selectionLevel)}, {inputMode}
        </div>
      </div>
      <textarea
        ref={editorTextAreaRef}
        style={{
          display: editorMode === "edit" ? "block" : "none",
        }}
        onChange={(e) => setEditorContent(e.target.value)}
        className="outline-none p-4 leading-[22px] text-white absolute bg-transparent top-0 left-0 right-0 h-[120%]"
      >
        {editorContent}
      </textarea>
      {/* <div
        contentEditable={editorMode === "edit"}
        ref={contentEditableRef}
        suppressContentEditableWarning={true}
        onInput={(e) => {
          setRawText(e.currentTarget.textContent || "");
        }}
        style={{
          display: editorMode === "edit" ? "block" : "none",
        }}
        className="outline-none p-4 text-white absolute bg-transparent inset-0"
      >
        {rawText.split("\n").map((paragraph, index) => (
          <div key={index} className="block">
            <div>
              {paragraph.split(" ").map((text, index) => (
                <span
                  key={index}
                  className="inline-block outline-none py-[4px]"
                >
                  <span>{text}</span>
                  {text && <span>&nbsp;</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div> */}
    </div>
  );
};

export default DocumentBlock;
