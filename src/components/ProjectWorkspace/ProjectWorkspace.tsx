"use client";

import { useContext, useState } from "react";
import PromptTextEditor from "../PromptTextEditor/PromptTextEditor";
import { CONTENT } from "../PromptTextEditor/DocumentProvider";
import { ConfirmIcon } from "./ConfirmIcon";
import Tooltip from "./Tooltip";
import React from "react";

const CreateVariationContext = React.createContext({
  createVariation: () => {},
  variations: [] as string[],
});

export const useCreateVariation = () => useContext(CreateVariationContext);

function ProjectWorkspace() {
  const [currentVariation, setCurrentVariation] = useState(0);
  const [variations, setVariations] = useState<string[]>([CONTENT]);
  const [isHoveringVariationSelector, setIsHoveringVariationSelector] =
    useState(false);

  const createVariation = () => {
    setVariations((prev) => {
      prev = [...prev, prev[currentVariation]];
      return prev;
    });
    // setCurrentVariation(currentVariation + 1);
  };
  return (
    <CreateVariationContext.Provider value={{ createVariation, variations }}>
      <div className="relative max-w-[56ch] mx-auto">
        <div
          onMouseLeave={() => setIsHoveringVariationSelector(false)}
          onMouseEnter={() => setIsHoveringVariationSelector(true)}
          className="flex flex-col absolute -left-8 mt-4 z-10"
        >
          {variations.map((_, index) => {
            return (
              <button
                key={index}
                className={`w-6 select-none h-6 text-[14px] ${variations.length > 1 ? "block" : "hidden"} ${index === currentVariation ? "opacity-80" : isHoveringVariationSelector ? "opacity-40" : "opacity-20"}`}
                onClick={() => setCurrentVariation(index)}
              >
                {index + 1}
              </button>
            );
          })}
          <Tooltip message={`New variation`}>
            <button
              className={`w-6 h-5 flex items-center justify-center ${variations.length <= 1 ? "opacity-50" : isHoveringVariationSelector ? "opacity-50" : "opacity-20"}`}
              onClick={createVariation}
            >
              +
            </button>
          </Tooltip>
          <div
            className={`${variations.length <= 1 ? "hidden" : isHoveringVariationSelector ? "opacity-50 mt-2" : " mt-2 opacity-0"}`}
          >
            <Tooltip message={`Accept variation "${currentVariation + 1}"`}>
              <button className="h-6 w-6 flex justify-center items-center opacity-60 bg-zinc-700 rounded-md">
                <ConfirmIcon />
              </button>
            </Tooltip>
          </div>
        </div>
        {variations.map((promptString, index) => {
          return (
            <div
              key={index}
              className={currentVariation === index ? "block" : "hidden"}
            >
              <PromptTextEditor
                isActive={currentVariation === index}
                promptText={promptString}
                onPromptTextUpdate={(latestText) =>
                  setVariations((prev) => {
                    prev[index] = latestText;
                    return prev;
                  })
                }
              />
            </div>
          );
        })}
      </div>
    </CreateVariationContext.Provider>
  );
}

export default ProjectWorkspace;
