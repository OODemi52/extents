import React, { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

import { vertexShader } from "./shaders/vertex-shader";
import { fragmentShader } from "./shaders/fragment-shader";

type SpecMode =
  | "idle"
  | "active"
  | "working"
  | "suggestion"
  | "offline"
  | "complete";

const SpecSprite: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SpecMode>("working");

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();

    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );

    camera.position.set(0, -2, 14);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

    renderer.setClearColor(0x000000, 0);

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.5, // strength
      0.1, // radius
      0.2, // threshold
    );

    const composer = new EffectComposer(renderer);

    composer.addPass(renderScene);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const modes = {
      offline: {
        color: { r: 0.1, g: 0.1, b: 0.1 },
        baseFrequency: 0,
        fluctuation: 1.5,
        speed: 0.3,
      },
      idle: {
        color: { r: 0.7, g: 0.7, b: 0.7 },
        baseFrequency: 20,
        fluctuation: 0,
        speed: 0,
      },
      active: {
        color: { r: 1, g: 0.8, b: 0.3 },
        baseFrequency: 20,
        fluctuation: 15,
        speed: 1.5,
      },
      suggestion: {
        color: { r: 0.3, g: 0.65, b: 2 },
        baseFrequency: 20,
        fluctuation: 15,
        speed: 1.5,
      },
      working: {
        color: {
          get r() {
            return 0.8 + 0.5 * Math.sin(Date.now() * 0.001);
          },
          get g() {
            return 0.65 + 0.35 * Math.sin(Date.now() * 0.001 + Math.PI / 2);
          },
          get b() {
            return 0.65 + 0.35 * Math.sin(Date.now() * 0.001 + Math.PI);
          },
        },
        baseFrequency: 20,
        fluctuation: 1,
        speed: 0.3,
      },
      complete: {
        color: { r: 0.25, g: 1, b: 0.25 },
        baseFrequency: 0.5,
        fluctuation: 50,
        speed: 1.5,
      },
    };

    const uniforms = {
      u_time: { value: 0.0 },
      u_frequency: { value: 0.0 },
      u_red: { value: modes[mode].color.r },
      u_green: { value: modes[mode].color.g },
      u_blue: { value: modes[mode].color.b },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      wireframe: true,
    });

    const geometry = new THREE.IcosahedronGeometry(4, 30);
    const mesh = new THREE.Mesh(geometry, material);

    scene.add(mesh);

    let mouseX = 0;
    let mouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      const windowHalfX = window.innerWidth / 2;
      const windowHalfY = window.innerHeight / 2;

      mouseX = (e.clientX - windowHalfX) / 100;
      mouseY = (e.clientY - windowHalfY) / 100;
    };

    document.addEventListener("mousemove", onMouseMove);

    const clock = new THREE.Clock();

    const animate = () => {
      camera.position.x += (mouseX - camera.position.x) * 0.05;
      camera.position.y += (-mouseY - camera.position.y) * 0.5;
      camera.lookAt(scene.position);

      const config = modes[mode];

      uniforms.u_time.value = clock.getElapsedTime();
      uniforms.u_frequency.value =
        config.baseFrequency +
        Math.sin(clock.getElapsedTime() * config.speed) * config.fluctuation;
      uniforms.u_red.value = config.color.r;
      uniforms.u_green.value = config.color.g;
      uniforms.u_blue.value = config.color.b;

      composer.render();
      requestAnimationFrame(animate);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      composer.dispose();
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [mode]);

  // Keyboard handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      const modeOrder = [
        "idle",
        "active",
        "working",
        "suggestion",
        "offline",
        "complete",
      ];

      setMode((prevMode) => {
        const currentIndex = modeOrder.indexOf(prevMode);

        const nextIndex = (currentIndex + 1) % modeOrder.length;

        return modeOrder[nextIndex] as SpecMode;
      });
    }
  };

  const handleClick = () => {
    const modeOrder = [
      "idle",
      "active",
      "working",
      "suggestion",
      "offline",
      "complete",
    ];

    setMode((prevMode) => {
      const currentIndex = modeOrder.indexOf(prevMode);

      const nextIndex = (currentIndex + 1) % modeOrder.length;

      return modeOrder[nextIndex] as SpecMode;
    });
  };

  return (
    <>
      <div
        ref={containerRef}
        className="bg-transparent scale-[0.1] cursor-pointer z-50"
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      />
    </>
  );
};

export default SpecSprite;
