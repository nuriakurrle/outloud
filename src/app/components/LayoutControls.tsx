import { Layout, layouts } from "../data/layouts";
import { fonts } from "../data/fonts";
import { logos } from "../data/logos";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "./ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { Slider } from "./ui/slider";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card } from "./ui/card";

interface LayoutControlsProps {
  selectedLayout: Layout;
  onLayoutChange: (layout: Layout) => void;
  selectedLogo: string;
  onLogoChange: (logoId: string) => void;
  headerText: string;
  onHeaderTextChange: (text: string) => void;
  headerFont: string;
  onHeaderFontChange: (font: string) => void;
  headerSize: number;
  onHeaderSizeChange: (size: number) => void;
  subheaderText: string;
  onSubheaderTextChange: (text: string) => void;
  subheaderFont: string;
  onSubheaderFontChange: (font: string) => void;
  subheaderSize: number;
  onSubheaderSizeChange: (size: number) => void;
  onImageUpload: (imageData: string) => void;
}

export function LayoutControls({
  selectedLayout,
  onLayoutChange,
  selectedLogo,
  onLogoChange,
  headerText,
  onHeaderTextChange,
  headerFont,
  onHeaderFontChange,
  headerSize,
  onHeaderSizeChange,
  subheaderText,
  onSubheaderTextChange,
  subheaderFont,
  onSubheaderFontChange,
  subheaderSize,
  onSubheaderSizeChange,
  onImageUpload,
}: LayoutControlsProps) {
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 bg-gray-50">
      {/* Layouts Carousel */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Layout Template</Label>
        <Carousel className="w-full">
          <CarouselContent>
            {layouts.map((layout) => (
              <CarouselItem key={layout.id} className="basis-full">
                <Card
                  className={`p-4 cursor-pointer transition-all ${
                    selectedLayout.id === layout.id
                      ? "border-2 border-blue-500 bg-blue-50"
                      : "border hover:border-gray-400"
                  }`}
                  onClick={() => onLayoutChange(layout)}
                >
                  <div className="space-y-2">
                    <h3 className="font-semibold">{layout.name}</h3>
                    <p className="text-xs text-gray-600">{layout.preview}</p>
                    <div className="w-full h-24 bg-slate-700 rounded relative overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-white text-xs opacity-50">Preview</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </div>

      {/* Logo Selection */}
      <div className="space-y-3">
        <Label htmlFor="logo-select" className="text-sm font-semibold">Logo</Label>
        <Select value={selectedLogo} onValueChange={onLogoChange}>
          <SelectTrigger id="logo-select">
            <SelectValue placeholder="Select a logo" />
          </SelectTrigger>
          <SelectContent>
            {logos.map((logo) => (
              <SelectItem key={logo.id} value={logo.id}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5">{logo.svg}</div>
                  <span>{logo.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Header Controls */}
      <div className="space-y-4 p-4 border rounded-lg bg-white">
        <h3 className="font-semibold text-sm">Header</h3>
        
        <div className="space-y-2">
          <Label htmlFor="header-text" className="text-xs">Text</Label>
          <Textarea
            id="header-text"
            value={headerText}
            onChange={(e) => onHeaderTextChange(e.target.value)}
            placeholder="Enter header text"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="header-font" className="text-xs">Font</Label>
          <Select value={headerFont} onValueChange={onHeaderFontChange}>
            <SelectTrigger id="header-font">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {fonts.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="header-size" className="text-xs">
            Font Size: {headerSize}px
          </Label>
          <Slider
            id="header-size"
            value={[headerSize]}
            onValueChange={(values) => onHeaderSizeChange(values[0])}
            min={20}
            max={120}
            step={2}
          />
        </div>
      </div>

      {/* Subheader Controls */}
      <div className="space-y-4 p-4 border rounded-lg bg-white">
        <h3 className="font-semibold text-sm">Subheader</h3>
        
        <div className="space-y-2">
          <Label htmlFor="subheader-text" className="text-xs">Text</Label>
          <Textarea
            id="subheader-text"
            value={subheaderText}
            onChange={(e) => onSubheaderTextChange(e.target.value)}
            placeholder="Enter subheader text"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subheader-font" className="text-xs">Font</Label>
          <Select value={subheaderFont} onValueChange={onSubheaderFontChange}>
            <SelectTrigger id="subheader-font">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {fonts.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  <span style={{ fontFamily: font.value }}>{font.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subheader-size" className="text-xs">
            Font Size: {subheaderSize}px
          </Label>
          <Slider
            id="subheader-size"
            value={[subheaderSize]}
            onValueChange={(values) => onSubheaderSizeChange(values[0])}
            min={14}
            max={80}
            step={2}
          />
        </div>
      </div>

      {/* Image Upload */}
      <div className="space-y-3">
        <Label htmlFor="image-upload" className="text-sm font-semibold">Upload Image</Label>
        <Input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="cursor-pointer"
        />
        <p className="text-xs text-gray-500">
          Upload an image to display in your poster layout
        </p>
      </div>
    </div>
  );
}
