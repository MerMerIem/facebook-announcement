import React, { useRef, useMemo } from "react";
import JoditEditor from "jodit-react";

const DescriptionEditor = ({ content, onUpdate, error }) => {
  const editor = useRef(null);

  const config = useMemo(
    () => ({
      autofocus: true,
      useSearch: false,
      iframe: true,
      language: "ar",
      direction: "rtl",
      allowResizeY: false,
      toolbarStickyOffset: -2,
      disablePlugins:
        "file,image,image-processor,image-propertiesm,video,speechRecognize,spellcheck,table",

      height: 800,
      minHeight: 600,

      toolbarInlineForSelection: true,
      showPlaceholder: false,
      readonly: false,
      placeholder: "Start typing...",

      iframeStyle: `
        @import url('https://fonts.googleapis.com/css2?family=Almarai&display=swap');
        body {
          font-family: 'Almarai', sans-serif;
        }
      `,
      defaultFontName: "Almarai,sans-serif",

      controls: {
        font: {
          list: {
            "Almarai,sans-serif": "Almarai",
          },
        },
        fontsize: {
          list: [
            "8",
            "9",
            "10",
            "11",
            "12",
            "14",
            "16",
            "18",
            "24",
            "30",
            "36",
            "48",
            "60",
            "72",
            "96",
          ],
        },
      },
      buttons:
        "bold,italic,underline,strikethrough,eraser,ul,ol,font,fontsize,paragraph,lineHeight,superscript,subscript,classSpan,table",
    }),
    []
  );

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <JoditEditor
        ref={editor}
        value={content}
        onBlur={(newContent) => onUpdate(newContent)}
        config={config}
      />
      {error && (
        <div style={{ color: "red", fontSize: "14px", marginTop: "5px" }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default DescriptionEditor;
