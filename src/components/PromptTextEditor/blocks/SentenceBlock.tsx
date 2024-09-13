import { MutableRefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  getTextFromRange,
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
import { useSentenceDraggingContext } from "../SentenceDraggingContext";

type SentenceBlockProp = {
  content: Sentence;
  position: SentencePosition;
};

export const SentenceBlock = ({ content, position }: SentenceBlockProp) => {
  const { draggingSelection, setDraggingSelection } =
    useSentenceDraggingContext();
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
  });

  useHotkeys("meta+/", (e) => {
    e.preventDefault();

    if (isSentenceSelectionMode && isSelected) {
      setIsCommented((commented) => !commented);
      return;
    }

    // try to see if a word inside the sentence is selected
    if (selectionRange === null) return;
    const isWithingWordSelection = isInsideSelectionRange(
      document,
      position,
      selectionRange
    );
    if (isWithingWordSelection) {
      setIsCommented((commented) => !commented);
    }
  });

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
    if (draggingSelection) return;

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
    draggingSelection,
  ]);

  const isWithinSelection = useMemo(() => {
    if (!selectionRange) return;
    const isWithingWordSelection = isInsideSelectionRange(
      document,
      position,
      selectionRange
    );
    return isWithingWordSelection;
  }, [document, position, selectionRange]);

  const handleMouseDown = () => {
    if (!isSentenceSelectionMode) return;
    // if (e.getModifierState("Shift")) {
    //   if (selectionRange !== null) {
    //     selectTo(position);
    //   }
    //   return;
    // }
    selectFrom(position);
    if (selectionRange && isSelected) {
      const currentSelectionRange = { from: position, to: position };
      setDraggingSelection({
        range: currentSelectionRange,
        content: document[position.paragraph][position.sentence].join(" "),
      });
    }
  };
  const handleDoubleClick = () => {
    selectFrom(position);
    stopSelecting();
  };

  const hasEndingDropTarget =
    document[position.paragraph].length - 1 === position.sentence;

  return (
    <span
      className={`${commentedStyle} ${
        draggingSelection && isWithinSelection && "opacity-80"
      } ${isSelected && ""}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <SentenceDropTarget
        isActive={draggingSelection}
        position={position}
        insertion={"before"}
      />
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
                isHoveringParentSentence={
                  isHovering && !draggingSelection && inputMode === "mouse"
                }
              />
            )}
            {/* add a space between word */}
          </React.Fragment>
        );
      })}
      {hasEndingDropTarget && content[0] !== "" && (
        <SentenceDropTarget
          isActive={draggingSelection}
          position={position}
          insertion={"after"}
        />
      )}
    </span>
  );
};

type SentenceDropTargetProps = {
  isActive: boolean;
  position: SentencePosition;
  insertion: "after" | "before";
};
function SentenceDropTarget({
  isActive,
  position,
  insertion,
}: SentenceDropTargetProps) {
  const { draggingSelection, allDropTargetRef, closestDropTarget } =
    useSentenceDraggingContext();

  const dropTargetRef = useRef() as MutableRefObject<HTMLSpanElement>;

  useEffect(() => {
    if (!draggingSelection) return;
    const hash = `${position.paragraph}-${position.sentence}-${insertion}`;
    const bounds = dropTargetRef.current.getBoundingClientRect();
    allDropTargetRef.current[hash] = {
      domPosition: bounds,
      position,
      insertion,
    };
  }, [
    draggingSelection,
    closestDropTarget,
    position,
    insertion,
    allDropTargetRef,
  ]);

  return (
    <span className="relative">
      <span
        ref={dropTargetRef}
        className={`${
          isActive &&
          closestDropTarget?.position === position &&
          closestDropTarget.insertion === insertion
            ? "opacity-100"
            : "opacity-0"
        } absolute left-0 inline-block bg-blue-300 w-1 h-full`}
      >
        &nbsp;
      </span>
    </span>
  );
}
