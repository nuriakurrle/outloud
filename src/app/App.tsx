import { useState } from "react";
import { layouts } from "./data/layouts";
import { logos } from "./data/logos";
import { fonts } from "./data/fonts";
import { PosterPreview } from "./components/PosterPreview";
import { LayoutControls } from "./components/LayoutControls";

export default function App() {
  const [selectedLayout, setSelectedLayout] = useState(layouts[0]);
  const [selectedLogo, setSelectedLogo] = useState(logos[0].id);
  const [headerText, setHeaderText] = useState("Welcome");
  const [headerFont, setHeaderFont] = useState(fonts[0].value);
  const [headerSize, setHeaderSize] = useState(48);
  const [subheaderText, setSubheaderText] = useState("Fresh Daily Specials");
  const [subheaderFont, setSubheaderFont] = useState(fonts[1].value);
  const [subheaderSize, setSubheaderSize] = useState(24);
  const [uploadedImage, setUploadedImage] = useState<string>();

  const currentLogo = logos.find((logo) => logo.id === selectedLogo);

  return (
    <div className="size-full flex">
      {/* Sidebar */}
      <div className="w-80 border-r bg-gray-50 flex-shrink-0">
        <div className="p-4 border-b bg-white">
          <h1 className="font-bold text-lg">Chalkboard Poster Generator</h1>
          <p className="text-xs text-gray-600 mt-1">Customize your poster design</p>
        </div>
        <LayoutControls
          selectedLayout={selectedLayout}
          onLayoutChange={setSelectedLayout}
          selectedLogo={selectedLogo}
          onLogoChange={setSelectedLogo}
          headerText={headerText}
          onHeaderTextChange={setHeaderText}
          headerFont={headerFont}
          onHeaderFontChange={setHeaderFont}
          headerSize={headerSize}
          onHeaderSizeChange={setHeaderSize}
          subheaderText={subheaderText}
          onSubheaderTextChange={setSubheaderText}
          subheaderFont={subheaderFont}
          onSubheaderFontChange={setSubheaderFont}
          subheaderSize={subheaderSize}
          onSubheaderSizeChange={setSubheaderSize}
          onImageUpload={setUploadedImage}
        />
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-gray-100 to-gray-200">
        <div 
          className="w-full max-w-4xl shadow-2xl rounded-lg overflow-hidden"
          style={{ aspectRatio: "3/4", maxHeight: "90vh" }}
        >
          <PosterPreview
            layout={selectedLayout}
            logoSvg={currentLogo?.svg}
            headerText={headerText}
            headerFont={headerFont}
            headerSize={headerSize}
            subheaderText={subheaderText}
            subheaderFont={subheaderFont}
            subheaderSize={subheaderSize}
            uploadedImage={uploadedImage}
          />
        </div>
      </div>
    </div>
  );
}