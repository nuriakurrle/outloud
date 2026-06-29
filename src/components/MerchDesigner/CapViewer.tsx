import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import * as THREE from "three";
import { useT } from "../../i18n";

// Prozedurale Umgebungs-Beleuchtung (IBL) – ohne externe HDR-Datei. Sorgt
// dafür, dass PBR-Materialien des Modells korrekt (nicht schwarz) erscheinen.
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = env.texture;
    return () => { env.texture.dispose(); pmrem.dispose(); scene.environment = null; };
  }, [gl, scene]);
  return null;
}
// Modell liegt – wie die T-Shirt-Bilder – unter assets/merch/ und wird von
// Vite gebündelt (?url liefert die aufgelöste Datei-URL).
import capUrl from "../../../assets/merch/baseball_cap.glb?url";

const MODEL_URL = capUrl;

type Status = "loading" | "ready" | "missing";

export interface CapViewerHandle { capture: () => Promise<Blob | null>; }

// Liefert eine Snapshot-Funktion der WebGL-Szene nach außen (für „Bestellen").
// Frisch rendern direkt vor toBlob – zusammen mit preserveDrawingBuffer am
// Canvas garantiert das ein gefülltes Bild statt eines leeren Puffers.
function CaptureBridge({ fnRef }: { fnRef: React.MutableRefObject<(() => Promise<Blob | null>) | null> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    fnRef.current = () => new Promise((resolve) => {
      gl.render(scene, camera);
      gl.domElement.toBlob((b) => resolve(b), "image/png");
    });
    return () => { fnRef.current = null; };
  }, [gl, scene, camera, fnRef]);
  return null;
}

// Druck als Decal: das Design (transparentes Canvas) wird per Raycast auf die
// echte Cap-Front projiziert und folgt so der gewölbten Oberfläche – statt als
// flache Platte davor zu schweben. DecalGeometry liefert Welt-Koordinaten,
// daher hängt das Mesh ohne eigene Transform direkt an der Szene.
function DesignDecal({ target, canvas }: { target: THREE.Object3D; canvas: HTMLCanvasElement }) {
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [canvas]);
  useEffect(() => { texture.needsUpdate = true; }, [canvas, texture]);

  const aspect = canvas.height / canvas.width; // Design ist hochformatig
  const geometry = useMemo(() => {
    target.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(target);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    // Strahl von vorne (+Z) in die Cap, leicht oberhalb der Mitte (Front-Panel).
    const ray = new THREE.Raycaster(
      new THREE.Vector3(center.x, center.y + size.y * 0.12, box.max.z + size.z),
      new THREE.Vector3(0, 0, -1)
    );
    const hit = ray.intersectObject(target, true)[0];
    if (!hit?.face) return null;
    const mesh = hit.object as THREE.Mesh;
    const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize();
    const orienter = new THREE.Object3D();
    orienter.position.copy(hit.point);
    orienter.lookAt(hit.point.clone().add(normal));
    // Breite ~ halbe Cap-Breite; Höhe aus Seitenverhältnis, auf Front begrenzt.
    let w = size.x * 0.5;
    let h = w * aspect;
    const maxH = size.y * 0.6;
    if (h > maxH) { h = maxH; w = h / aspect; }
    return new DecalGeometry(mesh, hit.point, orienter.rotation, new THREE.Vector3(w, h, size.z * 0.5));
  }, [target, aspect]);

  if (!geometry) return null;
  return (
    <mesh geometry={geometry} renderOrder={1}>
      <meshBasicMaterial map={texture} transparent alphaTest={0.04} toneMapped={false} depthWrite={false} polygonOffset polygonOffsetFactor={-4} />
    </mesh>
  );
}

// Drehbare 3D-Vorschau eines Cap-Modells (.glb) mit optionalem Design vorne.
export const CapViewer = forwardRef<CapViewerHandle, { design?: HTMLCanvasElement | null; color?: "black" | "white"; onReady?: () => void }>(
  function CapViewer({ design, color = "black", onReady }, ref) {
  const { t } = useT();
  const [object, setObject] = useState<THREE.Object3D | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const captureRef = useRef<(() => Promise<Blob | null>) | null>(null);
  useImperativeHandle(ref, () => ({ capture: () => captureRef.current?.() ?? Promise.resolve(null) }), []);

  // Cap auf Schwarz/Weiß tönen, damit das Design (Gegenfarbe) immer kontrastiert.
  useEffect(() => {
    if (!object) return;
    const hex = color === "white" ? "#e8e8e8" : "#1a1a1a";
    object.traverse((o) => {
      const mat = (o as THREE.Mesh).material;
      (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((m) => {
        const cm = m as THREE.MeshStandardMaterial;
        if (cm.color) { cm.color.set(hex); cm.map = null; cm.needsUpdate = true; }
      });
    });
  }, [object, color]);

  useEffect(() => {
    let alive = true;
    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (!alive) return;
        // Auf ~1 Einheit normieren, dann anhand der *skalierten* Bounding-Box
        // exakt im Ursprung zentrieren – robust gegen beliebige Pivot-Punkte
        // und Original-Größen des Modells, damit die Kamera es immer rahmt.
        const s = gltf.scene;
        const maxDim = Math.max(...new THREE.Box3().setFromObject(s).getSize(new THREE.Vector3()).toArray()) || 1;
        s.scale.setScalar(1 / maxDim);
        const center = new THREE.Box3().setFromObject(s).getCenter(new THREE.Vector3());
        s.position.sub(center);
        setObject(s);
        setStatus("ready");
        onReady?.();
      },
      undefined,
      () => alive && setStatus("missing")
    );
    return () => { alive = false; };
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#111" }}>
      <Canvas dpr={[1, 2]} gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 0, 2.4], fov: 40 }}>
        <StudioEnvironment />
        <ambientLight intensity={0.4} />
        <directionalLight position={[4, 6, 5]} intensity={1.1} />
        <directionalLight position={[-4, 2, -5]} intensity={0.4} />
        {object && <primitive object={object} />}
        {object && design && <DesignDecal target={object} canvas={design} />}
        <OrbitControls makeDefault enablePan={false} minDistance={1.4} maxDistance={5} />
        <CaptureBridge fnRef={captureRef} />
      </Canvas>

      {status !== "ready" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", color: "#888", fontSize: 14, lineHeight: 1.5, textAlign: "center", padding: 24, fontFamily: "'Inria Sans', system-ui, sans-serif" }}>
          {status === "loading"
            ? t.capLoading
            : <span>{t.capLoadFailed}<br /><b style={{ color: "#bbb" }}>assets/merch/baseball_cap.glb</b></span>}
        </div>
      )}
    </div>
  );
});
