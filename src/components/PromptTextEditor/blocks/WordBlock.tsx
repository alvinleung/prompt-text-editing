import { useEffect, useState } from "react";
import {
  isEqualPosition,
  isInsideSelectionRange,
  Precision,
  useCursorState,
  WordPosition,
} from "../CursorStateProvider";
import { useDocument } from "../DocumentProvider";
import React from "react";

type WordBlockProp = {
  content: string;
  position: WordPosition;
  spaceBefore?: boolean;
  spaceAfter?: boolean;
  isHoveringParentSentence: boolean;
};

export const WordBlock = ({
  content,
  position,
  spaceBefore,
  spaceAfter,
  isHoveringParentSentence,
}: WordBlockProp) => {
  const { document, updateWord, getWord } = useDocument();
  const { selectionLevel, selectFrom, selectTo, selectionRange, isSelecting } =
    useCursorState();

  const isSelectionModeSentence = selectionLevel === Precision.SENTENCE;
  const canSelectWord = selectionLevel === Precision.WORD;

  const [isHovering, setIsHovering] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const selectionColorStyle =
    (canSelectWord && isHovering) ||
    (isSelectionModeSentence && isHoveringParentSentence)
      ? "bg-zinc-700"
      : isSelected
        ? "bg-zinc-700"
        : "";

  const handleSelect = () => {
    if (!canSelectWord) return;
    selectFrom(position);
  };

  useEffect(() => {
    if (!canSelectWord) return;
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
    canSelectWord,
    isSelecting,
  ]);

  useEffect(() => {
    const inSelectionRange =
      selectionRange &&
      isInsideSelectionRange(document, position, selectionRange);

    setIsSelected(inSelectionRange || false);
  }, [selectionRange, position, document]);

  return (
    <React.Fragment>
      {spaceBefore && (
        <span className={`${selectionColorStyle} py-[2.5px]`}> </span>
      )}
      <span
        onMouseDown={handleSelect}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`inline-block outline-none py-[4px] ${selectionColorStyle}`}
      >
        {content}
      </span>
      {spaceAfter && (
        <span className={`${selectionColorStyle} py-[2.5px]`}>&nbsp;</span>
      )}
    </React.Fragment>
  );
};
