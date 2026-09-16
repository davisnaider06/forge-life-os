'use client';
import { useEffect, useRef } from 'react';
export function EnergyButton({ onClick, label }: { onClick: () => void; label: string }) {
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let stop: (() => void) | undefined,
      disposed = false;
    const timeout = setTimeout(async () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      try {
        const THREE = await import('three');
        if (disposed || !host.current) return;
        let renderer;
        try {
          renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'low-power',
          });
        } catch {
          return;
        }
        renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        renderer.setSize(55, 55);
        renderer.setClearColor(0, 0);
        const element = host.current;
        element.appendChild(renderer.domElement);
        element.parentElement?.classList.add('webgl-ready');
        const scene = new THREE.Scene(),
          camera = new THREE.PerspectiveCamera(33, 1, 0.1, 30);
        camera.position.z = 5;
        scene.add(new THREE.AmbientLight(0xc9ffff, 2.2));
        const light = new THREE.DirectionalLight(0xffffff, 4);
        light.position.set(2, 4, 5);
        scene.add(light);
        const group = new THREE.Group(),
          mat = new THREE.MeshPhysicalMaterial({
            color: 0xd2ffff,
            metalness: 0.25,
            roughness: 0.19,
            clearcoat: 1,
          });
        scene.add(group);
        [0.52, 0.85, 1.18, 0.7, 0.92].forEach((h, i) => {
          const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, h, 4, 8), mat);
          mesh.position.x = (i - 2) * 0.18;
          group.add(mesh);
        });
        const start = performance.now();
        const draw = () => {
          group.rotation.y = Math.sin((performance.now() - start) * 0.00055) * 0.24;
          renderer.render(scene, camera);
        };
        const mq = matchMedia('(prefers-reduced-motion: reduce)');
        const visibility = () => {
          renderer.setAnimationLoop(document.hidden || mq.matches ? null : draw);
          if (!document.hidden) draw();
        };
        document.addEventListener('visibilitychange', visibility);
        mq.addEventListener('change', visibility);
        visibility();
        stop = () => {
          renderer.setAnimationLoop(null);
          scene.traverse(o => {
            if (o instanceof THREE.Mesh) o.geometry.dispose();
          });
          mat.dispose();
          renderer.dispose();
          element.replaceChildren();
          element.parentElement?.classList.remove('webgl-ready');
          document.removeEventListener('visibilitychange', visibility);
          mq.removeEventListener('change', visibility);
        };
      } catch {
        /* CSS fallback remains visible. */
      }
    }, 500);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      stop?.();
    };
  }, []);
  return (
    <button className="energy-button" onClick={onClick} aria-label={label}>
      <span className="energy-fallback">✦</span>
      <span id="energy-canvas" ref={host} aria-hidden="true" />
    </button>
  );
}
