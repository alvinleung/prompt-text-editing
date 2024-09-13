import React, {
  createContext,
  memo,
  MutableRefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  SelectionRange,
  SentencePosition,
  useCursorState,
} from "./CursorStateProvider";
import { useEventListener } from "usehooks-ts";
import { unescape } from "querystring";
import { useDocument } from "./DocumentProvider";
import { useHotkeys } from "react-hotkeys-hook";

type Props = {
  children: React.ReactNode;
};

export type DraggingSelection = {
  range: SelectionRange;
  content: string;
};

export type SentenceDropTarget = {
  position: SentencePosition;
  domPosition: {
    left: number;
    top: number;
  };
  insertion: "before" | "after";
};

const DraggingContext = createContext({
  draggingSelection: undefined as undefined | DraggingSelection,
  setDraggingSelection: (selection: undefined | DraggingSelection) => {},
  closestDropTarget: undefined as undefined | SentenceDropTarget,
  allDropTargetRef: {
    current: undefined,
  } as unknown as MutableRefObject<{ [key: string]: SentenceDropTarget }>,
});

export const useSentenceDraggingContext = () => useContext(DraggingContext);
const SentenceDraggingContextProvider = ({ children }: Props) => {
  const { moveSentence, copySentence } = useDocument();
  const [draggingSelection, setDraggingSelection] = useState<
    undefined | DraggingSelection
  >();

  const [closestDropTarget, setClosestDropTarget] = useState<
    SentenceDropTarget | undefined
  >();
  const { selectFrom } = useCursorState();
  const allDropTargetRef = useRef<{ [key: string]: SentenceDropTarget }>({});

  const isHoldingOption = useRef(false);

  useEventListener("keydown", (e) => {
    if (e.key === "Alt") {
      // Detecting the Option key
      isHoldingOption.current = true;
    }
  });

  useEventListener("keyup", (e) => {
    if (e.key === "Alt") {
      // Reset when the Option key is released
      isHoldingOption.current = false;
    }
  });

  useEventListener("mouseup", () => {
    if (!draggingSelection || !closestDropTarget) return;
    if (isHoldingOption.current) {
      copySentence(
        draggingSelection.range,
        closestDropTarget.position,
        closestDropTarget.insertion
      );
    } else {
      moveSentence(
        draggingSelection.range,
        closestDropTarget.position,
        closestDropTarget.insertion
      );
    }
    setDraggingSelection(undefined);
    selectFrom(
      closestDropTarget.insertion === "before"
        ? closestDropTarget.position
        : {
            ...closestDropTarget.position,
            sentence: closestDropTarget.position.sentence + 1,
          }
    );
  });

  const dragPos = useRef({ x: 0, y: 0 });
  const dragGhostRef = useRef() as MutableRefObject<HTMLDivElement>;
  useEffect(() => {
    if (!draggingSelection) return;
    dragGhostRef.current.style.opacity = "0";

    const handleMove = (e: MouseEvent) => {
      dragPos.current = {
        x: e.clientX,
        y: e.clientY,
      };

      let closest: SentenceDropTarget | undefined;
      let minDistance = Infinity;

      const dropTargets = Object.values(allDropTargetRef.current);

      for (const target of dropTargets) {
        const targetCenterX = target.domPosition.left; // Adjust as needed
        const targetCenterY = target.domPosition.top; // Adjust as needed
        const distance = Math.sqrt(
          Math.pow(targetCenterX - e.clientX, 2) +
            Math.pow(targetCenterY - e.clientY, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closest = target;
        }
      }

      // Set the closest drop target if found
      if (closest) {
        setClosestDropTarget(closest);
      }

      dragGhostRef.current.style.opacity = ".2";
      dragGhostRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    window.addEventListener("pointermove", handleMove);
    return () => {
      window.removeEventListener("pointermove", handleMove);
    };
  }, [draggingSelection]);

  return (
    <DraggingContext.Provider
      value={{
        draggingSelection,
        setDraggingSelection,
        allDropTargetRef,
        closestDropTarget,
      }}
    >
      {children}
      <div
        ref={dragGhostRef}
        className="pointer-events-none fixed max-w-[56ch] text-[14px] opacity-20 left-0 top-0"
      >
        {draggingSelection?.content}
      </div>
    </DraggingContext.Provider>
  );
};

export default SentenceDraggingContextProvider;
