import { useState } from "react";
import {
  getWordPositionAbs,
  SelectionLevel,
  useCursorState,
  WordPosition,
} from "../CursorStateProvider";
import { useDocument } from "../DocumentProvider";

type WordBlockProp = {
  content: string;
  position: WordPosition;
};
export const WordBlock = ({ content, position }: WordBlockProp) => {
  const { document } = useDocument();
  const { selectionLevel } = useCursorState();
  const canSelectWord = selectionLevel === SelectionLevel.WORD;

  const [isHovering, setIsHovering] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const selectionColorStyle =
    canSelectWord && isHovering
      ? "bg-zinc-700"
      : isSelected
      ? "bg-zinc-700"
      : "";

  const handleSelect = () => {
    // console.log(getWordPositionAbs(document, position));
  };
  return (
    <span
      onMouseDown={handleSelect}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`inline-block py-[4px] ${selectionColorStyle}`}
    >
      {content}
    </span>
  );
};
