"use client";

import { useCallback, useContext, useState } from "react";
import PromptTextEditor from "../PromptTextEditor/PromptTextEditor";
import { CONTENT } from "../PromptTextEditor/DocumentProvider";
import { ConfirmIcon } from "./ConfirmIcon";
import Tooltip from "./Tooltip";
import React from "react";
import DiffViewer from "../DiffViewer/DiffViewer";
import { useHover } from "usehooks-ts";
import { RunIcon } from "./RunIcon";

const CreateVariationContext = React.createContext({
  createVariation: () => {},
  variations: [] as string[],
  // updateVariation: (text:string, index:number) => {},
  setIsVariationSelectorActive: (active: boolean) => {},
});

export const useCreateVariation = () => useContext(CreateVariationContext);

function ProjectWorkspace() {
  const [currentVariation, setCurrentVariation] = useState(0);
  const [previewingVariation, setPreviewingVariation] = useState<
    number | undefined
  >(undefined);
  const [variations, setVariations] = useState<string[]>([CONTENT]);
  const [isHoveringVariationSelector, setIsHoveringVariationSelector] =
    useState(false);
  const [isActive, setIsActive] = useState(true);
  const [variationColours, setVariationColours] = useState<string[]>([
    "#ECC2E8",
    "#C1DFEC",
    "#ECE8C1",
    "#ECD2C1",
  ]);

  const MAX_ITERATIONS = 4;
  const createVariation = useCallback(() => {
    setVariations((prev) => {
      if (prev.length >= MAX_ITERATIONS) return prev;
      prev = [...prev, prev[currentVariation]];
      return prev;
    });
    // setCurrentVariation(currentVariation + 1);
  }, [currentVariation]);
  return (
    <CreateVariationContext.Provider
      value={{
        createVariation,
        variations,
        setIsVariationSelectorActive: setIsActive,
      }}
    >
      <div className="relative max-w-[56ch] mx-auto">
        <div
          onMouseLeave={() => setIsHoveringVariationSelector(false)}
          onMouseEnter={() => setIsHoveringVariationSelector(true)}
          className={`${isActive ? "opacity-100" : "opacity-40 pointer-events-none"} flex flex-col absolute -left-8 mt-4 z-10`}
        >
          <div
            className={`flex flex-col ${variations.length !== 1 && "bg-zinc-800"} rounded-md mt`}
          >
            {variations.map((_, index) => {
              //TODO: for testing purposes
              return (
                <Tooltip message={`Variation ${index + 1}`} key={index}>
                  <button
                    className={`w-6 select-none h-6 text-[14px] ${variations.length > 1 ? "block" : "hidden"} ${index === previewingVariation || index === currentVariation ? "opacity-80" : isHoveringVariationSelector ? "opacity-40" : "opacity-20"}`}
                    onMouseEnter={() => setPreviewingVariation(index)}
                    onMouseLeave={() => setPreviewingVariation(undefined)}
                    onClick={() => setCurrentVariation(index)}
                    style={{
                      color: variationColours[index],
                    }}
                  >
                    {index + 1}
                  </button>
                </Tooltip>
              );
            })}
            {variations.length < MAX_ITERATIONS && (
              <Tooltip message={`New variation`}>
                <button
                  className={`${variations.length !== 1 && "border-t"} border-t-zinc-600 opacity-40 w-6 h-6 flex items-center justify-center`}
                  onClick={() => {
                    createVariation();
                    setCurrentVariation(variations.length);
                  }}
                >
                  +
                </button>
              </Tooltip>
            )}
          </div>
          <div
            className={`flex flex-col ${variations.length <= 1 ? "hidden" : isHoveringVariationSelector ? "opacity-50 mt-2" : " mt-2 opacity-50"}`}
          >
            <Tooltip message={`Run and compare`}>
              <button
                className={`h-6 w-6 flex justify-center items-center opacity-60 rounded-md`}
              >
                <RunIcon />
              </button>
            </Tooltip>
            <Tooltip message={`Commit variation "${currentVariation + 1}"`}>
              <button
                className={`h-6 w-6 flex justify-center items-center opacity-60`}
              >
                <ConfirmIcon />
              </button>
            </Tooltip>
          </div>
        </div>

        {variations.map((promptString, index) => {
          return (
            <div
              key={index}
              className={`${variations.length > 1 && previewingVariation !== undefined && previewingVariation !== currentVariation ? "opacity-0" : "opacity-100"} ${currentVariation === index ? "block" : "hidden"}`}
              style={{
                color: variations.length > 1 ? variationColours[index] : "#FFF",
              }}
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

        <div
          className="absolute inset-0 p-4 text-[14px] leading-[22px] pointer-events-none"
          style={{
            color:
              previewingVariation !== undefined
                ? variationColours[previewingVariation]
                : "inherit",
          }}
        >
          {variations.length > 1 &&
            previewingVariation !== undefined &&
            previewingVariation !== currentVariation && (
              <DiffViewer
                before={variations[currentVariation]}
                after={variations[previewingVariation]}
              />
            )}
        </div>
      </div>
    </CreateVariationContext.Provider>
  );
}

export default ProjectWorkspace;
