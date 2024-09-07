import { useEffect, useState } from "react";
import {
  getSentencePositionAbs,
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
import { useEventListener } from "usehooks-ts";

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

  useHotkeys("x", () => {
    if (!isSelected) return;
    setIsCommented((commented) => !commented);
    setIsSelected(false);
  });

  useEffect(() => {
    if (!selectionRange) {
      setIsSelected(false);
      return;
    }
    if (!isSelecting) return;
    if (isInsideSelectionRange(document, position, selectionRange)) {
      // console.log("inside selection range");
      setIsSelected(true);
      return;
    }
    setIsSelected(false);
  }, [selectionRange, position, isSelecting]);

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

  const handleMouseUp = () => {};

  return (
    <span
      className={`${selectionColorStyle} ${commentedStyle}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
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
        const isVariable = typeof item !== "string";
        return (
          <React.Fragment key={index}>
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
            {!isLastElement && <span> </span>}
            {/* adding a period at the end of the sentence */}
            {isLastElement && <span>{"."}</span>}
          </React.Fragment>
        );
      })}
    </span>
  );
};
