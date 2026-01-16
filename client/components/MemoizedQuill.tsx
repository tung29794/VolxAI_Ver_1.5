import React from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

interface MemoizedQuillProps {
  quillRef: React.RefObject<ReactQuill>;
  content: string;
  setContent: (value: string) => void;
  modules: any;
  onSelectionChange?: (selection: any) => void;
}

const MemoizedQuill: React.FC<MemoizedQuillProps> = ({
  quillRef,
  content,
  setContent,
  modules,
  onSelectionChange,
}) => {
  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={content}
      onChange={setContent}
      onChangeSelection={onSelectionChange}
      className="flex-1 rounded-md shadow-sm overflow-hidden"
      modules={modules}
    />
  );
};

export default MemoizedQuill;
