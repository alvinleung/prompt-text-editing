import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  isEqualPosition,
  isInsideSelectionRange,
  Precision,
  useCursorState,
  WordPosition,
} from "../CursorStateProvider";
import { useDocument } from "../DocumentProvider";
import React from "react";
import { useWordPositionInfoRegistry } from "../WordPositionInfoProvder";

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
  const { registerWordInfo } = useWordPositionInfoRegistry();
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

  const wordRef = useRef() as MutableRefObject<HTMLSpanElement>;
  const [bounds, setBounds] = useState({
    left: 0,
    width: 0,
    top: 0,
    height: 0,
  });

  useEffect(() => {
    const measureElm = () => {
      setBounds(wordRef.current.getBoundingClientRect());
    };
    window.addEventListener("resize", measureElm);
    measureElm();
    return () => {
      window.removeEventListener("resize", measureElm);
    };
  }, []);

  //TODO: jank because not reliable — for PROTOTYPE PURPOSE ONLY
  const wordLine_jank = useMemo(() => {
    const roughCalc = (bounds.top - 16) / 22;
    // const lineHeight = 14 + 2.5 + 2.5;
    return Math.round(roughCalc);
  }, [bounds]);

  useEffect(() => {
    registerWordInfo({
      line: wordLine_jank,
      position: position,
      pixelLeft: bounds.left + bounds.width / 2,
      text: content,
    });
  }, [bounds, content, position, registerWordInfo, wordLine_jank]);

  const hasPeriod = content[content.length - 1] === ".";
  const isContentEmpty = content === "";

  return (
    <React.Fragment>
      {spaceBefore && (
        <span className={`${selectionColorStyle} py-[2.5px]`}> </span>
      )}
      <span
        ref={wordRef}
        onMouseDown={handleSelect}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`inline-block outline-none py-[4px] ${selectionColorStyle}`}
      >
        {isContentEmpty && <>&nbsp;</>}
        {!hasPeriod && content}
        {hasPeriod && (
          <>
            {content.replace(".", "")}
            <span className="opacity-50">.</span>
          </>
        )}
      </span>
      {!isContentEmpty && spaceAfter && (
        <span className={`${selectionColorStyle} py-[2.5px]`}> </span>
      )}
    </React.Fragment>
  );
};
