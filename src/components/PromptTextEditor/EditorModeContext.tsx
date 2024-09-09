import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useState,
} from "react";
import { useDocument } from "./DocumentProvider";
import { getSelectionPrecision, SelectionRange } from "./CursorStateProvider";

type Props = {};

type EditorMode = "select" | "edit";
const EditorModeContext = createContext({
  editorMode: "select" as EditorMode,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setEditorMode: (_mode: EditorMode) => {},
});

export const useEditorMode = () => useContext(EditorModeContext);

const EditorModeContextProvider = ({ children }: PropsWithChildren<Props>) => {
  const [editorMode, setEditorMode] = useState<EditorMode>("select");
  const { rawText, document } = useDocument();
  const enterEditModeWithSelection = (selectionRange: SelectionRange) => {};
  return (
    <EditorModeContext.Provider
      value={{
        setEditorMode,
        editorMode,
      }}
    >
      {children}
    </EditorModeContext.Provider>
  );
};

export default EditorModeContextProvider;
