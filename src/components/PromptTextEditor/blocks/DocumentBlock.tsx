import React from "react";
import { ParagraphBlock } from "./ParagraphBlock";
import { useDocument } from "../DocumentProvider";
import {
  getPrecisionName,
  Precision,
  useCursorState,
} from "../CursorStateProvider";

type Props = {};

const DocumentBlock = (props: Props) => {
  const { document, rawText, setRawText } = useDocument();
  const { selectionLevel, inputMode } = useCursorState();

  const isSentenceSelectionMode = selectionLevel === Precision.SENTENCE;
  return (
    <div className="relative p-4 select-none max-w-[56ch] text-[14px] mx-auto leading-none tracking-normal">
      {document.map((paragraph, index) => (
        <ParagraphBlock
          content={paragraph}
          position={{ paragraph: index }}
          key={index}
        />
      ))}
      <div className="fixed p-4 mx-auto bottom-0 left-0 right-0 opacity-50">
        <div className="mx-auto min-w-[56ch]">
          {getPrecisionName(selectionLevel)}, {inputMode}
        </div>
      </div>
      {/* <div
        contentEditable={!isSentenceSelectionMode}
        suppressContentEditableWarning={true}
        onInput={(e) => {
          setRawText(e.currentTarget.textContent || "");
        }}
        style={{
          display: isSentenceSelectionMode ? "none" : "block",
        }}
        className="outline-none text-white absolute bg-transparent inset-0"
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
