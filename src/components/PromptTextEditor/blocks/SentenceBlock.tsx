import { useEffect, useState } from "react";
import {
  getSentencePositionAbs,
  isEqualPosition,
  isInsideSelectionRange,
  SentencePosition,
  useCursorState,
} from "../CursorStateProvider";
import { Sentence, useDocument } from "../DocumentProvider";
import { WordBlock } from "./WordBlock";
import React from "react";

type SentenceBlockProp = {
  content: Sentence;
  position: SentencePosition;
};

export const SentenceBlock = ({ content, position }: SentenceBlockProp) => {
  const { selectFrom, selectTo, selectionRange, isSelecting } =
    useCursorState();
  const { document } = useDocument();

  const [isHovering, setIsHovering] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isCommented, setIsCommented] = useState(false);

  const selectionColorStyle = isHovering
    ? "bg-zinc-700"
    : isSelected
    ? "bg-zinc-700"
    : "";

  const commentedStyle = isCommented ? "opacity-40" : "opacity-100";

  useEffect(() => {
    if (!isSelected) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/") {
        setIsCommented((commented) => !commented);
        setIsSelected(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSelected]);

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
                isSelected={false}
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
