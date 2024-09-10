import { useEffect, useState } from "react";
import {
  isEqualPosition,
  isInsideSelectionRange,
  Precision,
  SentencePosition,
  useCursorState,
} from "../CursorStateProvider";
import { Sentence, useDocument } from "../DocumentProvider";
import { WordBlock } from "./WordBlock";
import React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useEventCallback, useEventListener } from "usehooks-ts";

type SentenceBlockProp = {
  content: Sentence;
  position: SentencePosition;
};

export const SentenceBlock = ({ content, position }: SentenceBlockProp) => {
  const {
    selectionLevel,
    inputMode,
    selectFrom,
    selectTo,
    selectionRange,
    isSelecting,
    stopSelecting,
  } = useCursorState();
  const { document } = useDocument();

  const isSentenceSelectionMode = selectionLevel === Precision.SENTENCE;

  const [isHovering, setIsHovering] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [isCommented, setIsCommented] = useState(false);

  const commentedStyle = isCommented ? "opacity-20" : "opacity-100";

  useHotkeys("meta+shift+x", (e) => {
    e.preventDefault();
    if (!isSelected) return;
    setIsCommented((commented) => !commented);
    setIsSelected(false);
  });
  // useEventListener("keydown", (e) => {
  //   if (!(e.metaKey && e.shiftKey) || (e.key !== "s" && e.key !== "x")) return;
  //   e.preventDefault();
  //   if (!isSelected) return;
  //   setIsCommented((commented) => !commented);
  //   setIsSelected(false);
  // });

  useEffect(() => {
    if (!selectionRange) {
      setIsSelected(false);
      return;
    }
    // if (!isSelecting) return;
    if (
      isInsideSelectionRange(document, position, selectionRange) &&
      isSentenceSelectionMode
    ) {
      // console.log("inside selection range");
      setIsSelected(true);
      return;
    }
    setIsSelected(false);
  }, [selectionRange, position, document, isSentenceSelectionMode]);

  useEffect(() => {
    if (!isSentenceSelectionMode) return;
    if (!isHovering) return;
    if (!isSelecting) return;
    if (!selectionRange) return;

    const isCurrentPositionAtSelectionBound =
      isEqualPosition(selectionRange.from, position) ||
      (selectionRange.to && isEqualPosition(selectionRange.to, position));

    if (isCurrentPositionAtSelectionBound) return;

    selectTo(position);
  }, [
    isHovering,
    selectionRange,
    position,
    selectTo,
    isSentenceSelectionMode,
    isSelecting,
  ]);

  const handleMouseDown = (e: MouseEvent) => {
    if (!isSentenceSelectionMode) return;
    // if (e.getModifierState("Shift")) {
    //   if (selectionRange !== null) {
    //     selectTo(position);
    //   }
    //   return;
    // }
    selectFrom(position);
  };
  const handleDoubleClick = () => {
    selectFrom(position);
    stopSelecting();
  };

  return (
    <span
      className={`${commentedStyle}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
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
            {!isVariable && (
              <WordBlock
                position={{
                  paragraph: position.paragraph,
                  sentence: position.sentence,
                  word: index,
                }}
                content={item}
                spaceBefore={isFirstElement}
                spaceAfter={!isLastElement}
                isHoveringParentSentence={isHovering && inputMode === "mouse"}
              />
            )}
            {/* add a space between word */}
          </React.Fragment>
        );
      })}
    </span>
  );
};
