import { Layout } from "../data/layouts";

interface PosterPreviewProps {
  layout: Layout;
  logoSvg: React.ReactNode;
  headerText: string;
  headerFont: string;
  headerSize: number;
  subheaderText: string;
  subheaderFont: string;
  subheaderSize: number;
  uploadedImage?: string;
}

export function PosterPreview({
  layout,
  logoSvg,
  headerText,
  headerFont,
  headerSize,
  subheaderText,
  subheaderFont,
  subheaderSize,
  uploadedImage,
}: PosterPreviewProps) {
  const { config } = layout;

  return (
    <div className="relative w-full h-full bg-slate-800 overflow-hidden">
      {/* Chalkboard texture overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content container */}
      <div className="relative w-full h-full p-8">
        {/* Decorations */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          {config.decorations?.map((decoration, idx) => {
            if (decoration.type === 'border') {
              const [x1, y1, x2, y2] = decoration.positions;
              return (
                <rect
                  key={idx}
                  x={`${x1}%`}
                  y={`${y1}%`}
                  width={`${x2 - x1}%`}
                  height={`${y2 - y1}%`}
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="2"
                  strokeDasharray="10,5"
                />
              );
            }
            if (decoration.type === 'line') {
              const [x1, y1, x2, y2] = decoration.positions;
              return (
                <line
                  key={idx}
                  x1={`${x1}%`}
                  y1={`${y1}%`}
                  x2={`${x2}%`}
                  y2={`${y2}%`}
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="2"
                />
              );
            }
            if (decoration.type === 'corner') {
              const [x1, y1, x2, y2] = decoration.positions;
              return (
                <g key={idx} stroke="rgba(255, 255, 255, 0.6)" strokeWidth="2" fill="none">
                  <path d={`M ${x1}% ${y1 + 5}% L ${x1}% ${y1}% L ${x1 + 5}% ${y1}%`} />
                  <path d={`M ${x2 - 5}% ${y1}% L ${x2}% ${y1}% L ${x2}% ${y1 + 5}%`} />
                  <path d={`M ${x2}% ${y2 - 5}% L ${x2}% ${y2}% L ${x2 - 5}% ${y2}%`} />
                  <path d={`M ${x1 + 5}% ${y2}% L ${x1}% ${y2}% L ${x1}% ${y2 - 5}%`} />
                </g>
              );
            }
            return null;
          })}
        </svg>

        {/* Logo */}
        <div
          className="absolute text-white"
          style={{
            left: `${config.logoPosition.x}%`,
            top: `${config.logoPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            width: `${config.logoSize}px`,
            height: `${config.logoSize}px`,
          }}
        >
          {logoSvg}
        </div>

        {/* Header */}
        <div
          className="absolute text-white text-center whitespace-pre-wrap px-4"
          style={{
            left: `${config.headerPosition.x}%`,
            top: `${config.headerPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            fontFamily: headerFont,
            fontSize: `${headerSize}px`,
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
            maxWidth: '80%',
          }}
        >
          {headerText || "Your Header"}
        </div>

        {/* Subheader */}
        <div
          className="absolute text-gray-200 text-center whitespace-pre-wrap px-4"
          style={{
            left: `${config.subheaderPosition.x}%`,
            top: `${config.subheaderPosition.y}%`,
            transform: 'translate(-50%, -50%)',
            fontFamily: subheaderFont,
            fontSize: `${subheaderSize}px`,
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.3)',
            maxWidth: '80%',
          }}
        >
          {subheaderText || "Your Subheader"}
        </div>

        {/* Uploaded Image */}
        {uploadedImage && config.imagePosition && (
          <div
            className="absolute overflow-hidden rounded"
            style={{
              left: `${config.imagePosition.x}%`,
              top: `${config.imagePosition.y}%`,
              width: `${config.imagePosition.width}%`,
              height: `${config.imagePosition.height}%`,
              transform: 'translate(-50%, -50%)',
              border: '2px solid rgba(255, 255, 255, 0.6)',
            }}
          >
            <img 
              src={uploadedImage} 
              alt="Uploaded content" 
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>
    </div>
  );
}
