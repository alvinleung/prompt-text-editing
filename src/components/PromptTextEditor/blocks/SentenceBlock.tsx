import { useEffect, useState } from "react";
import {
  isEqualPosition,
  isInsideSelectionRange,
  SelectionLevel,
  SentencePosition,
  useCursorState,
} from "../CursorStateProvider";
import { Sentence, useDocument } from "../DocumentProvider";
import { WordBlock } from "./WordBlock";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";

type SentenceBlockProp = {
  content: Sentence;
  position: SentencePosition;
};

export const SentenceBlock = ({ content, position }: SentenceBlockProp) => {
  const { selectionLevel, selectFrom, selectTo, selectionRange, isSelecting } =
    useCursorState();
  const { document } = useDocument();

  const isSentenceSelectionMode = selectionLevel === SelectionLevel.SENTENCE;

  const [isHovering, setIsHovering] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isCommented, setIsCommented] = useState(false);

  const selectionColorStyle =
    isSentenceSelectionMode && isHovering
      ? "bg-zinc-700"
      : isSelected
      ? "bg-zinc-700"
      : "";

  const commentedStyle = isCommented ? "opacity-20" : "opacity-100";

  useHotkeys("shift+x", () => {
    if (!isSelected) return;
    setIsCommented((commented) => !commented);
    setIsSelected(false);
  });

  useEffect(() => {
    if (!selectionRange) {
      setIsSelected(false);
      return;
    }
    // if (!isSelecting) return;
    if (isInsideSelectionRange(document, position, selectionRange)) {
      // console.log("inside selection range");
      setIsSelected(true);
      return;
    }
    setIsSelected(false);
  }, [selectionRange, position, document]);

  useEffect(() => {
    if (!isHovering) return;
    if (!isSelecting) return;
    if (!selectionRange) return;

    const isCurrentPositionAtSelectionBound =
      isEqualPosition(selectionRange.from, position) ||
      (selectionRange.to && isEqualPosition(selectionRange.to, position));

    if (isCurrentPositionAtSelectionBound) return;

    selectTo(position);
  }, [isHovering, selectionRange, position, selectTo]);

  const handleMouseDown = () => {
    if (!isSentenceSelectionMode) return;
    selectFrom(position);
  };

  return (
    <span
      className={`${commentedStyle}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={handleMouseDown}
    >
      {/* {isCommented && (
        <span
          className="bg-zinc-600 px-1"
          onClick={() => setIsCommented(false)}
        >
          ...
        </span>
      )} */}
      {/* {!isCommented && */}
      {content.map((item, index) => {
        const isLastElement = index === content.length - 1;
        const isFirstElement = index === 0;
        const isVariable = typeof item !== "string";
        return (
          <React.Fragment key={index}>
            {!isVariable && isFirstElement && (
              <span className={`${selectionColorStyle} py-[2.5px]`}> </span>
            )}
            <span className={`inline-block ${selectionColorStyle}`}>
              {!isVariable && (
                <WordBlock
                  position={{
                    paragraph: position.paragraph,
                    sentence: position.sentence,
                    word: index,
                  }}
                  content={item}
                />
              )}
              {/* add a space between word */}
            </span>
            {!isLastElement && (
              <span className={`${selectionColorStyle} py-[2.5px]`}> </span>
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
};
