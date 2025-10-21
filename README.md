<div align="center">

# Extents
Modern, Performant, and Open Source AI-Native Photo Editor

![UI Screenshot](public/ui-01.png)

</div>

## About The Project

Extents is a modern, high-performance photo editor and browser built with a Rust core, a `wgpu` based rendering engine, and a reactive frontend powered by React + Vite and Tauri. The vision is to create a powerful, cross-platform tool for photographers and creatives that seamlessly integrates modern features into the editing workflow.

The application is currently in the early stages of development, focusing on building a solid foundation for file browsing and rendering before moving on to editing and AI functionality.

A core part of the development of this project is geared towards integrating AI features from the ground up that will assist user in their editing workflows. The will be implemented to compliment the users work, not to get in the way

---

## 🗺️ Roadmap

This project is being built in phases. Here is the current plan:

### Phase 1: Foundation - Performant File Explorer & UI
- [x] High-performance `wgpu` rendering backend for image display
- [ ] Performant file system indexing and photo browsing
- [x] Build out core UI components and layout
- [ ] Fully connect backend file browsing logic to the UI
- [ ] Performance enhancements for image loading and thumbnail generation
- [ ] Robust, modern, intutitive, and pleasant UI

### Phase 2: Core Editing Suite
- [ ] Implement non-destructive editing pipeline
- [ ] Basic image adjustments (Exposure, Contrast, Saturation, etc.)
- [ ] Cropping and rotation tools
- [ ] History panel for edit tracking

### Phase 3: AI-Powered Features
- [ ] Integrate local AI model runner for privacy-focused features
- [ ] Advanced AI tools (e.g., smart subject masking, generative fill)

### Phase 4: TBD 🚧


**⚠️Please note this roadmap is tenative and is subject to change. The project is moving fast, so the core architecture (and code quality) are subject to change until a more stable point is reached.**

---

## 🛠️ Tech Stack

*   **Framework:** [Tauri](https://tauri.app/)
*   **Core Logic & Renderer:** [Rust](https://www.rust-lang.org/) with [wgpu](https://wgpu.rs/)
*   **Frontend:** [React](https://react.dev/) with [Vite](https://vitejs.dev/)
*   **UI Components:** [HeroUI](https://heroui.com/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You will need to have the following installed on your system:

*   **Node.js & npm**
    *   [https://nodejs.org/](https://nodejs.org/)
*   **Rust & Cargo**
    *   The easiest way to install is via `rustup`: [https://rustup.rs/](https://rustup.rs/)
*   **Tauri Prerequisites**
    *   Follow the official Tauri guide for your operating system to install necessary dependencies (build tools, webview libraries, etc.).
    *   [https://tauri.app/v1/guides/getting-started/prerequisites](https://v2.tauri.app/start/prerequisites)

### Installation

1.  Clone the repo
    ```sh
    git clone https://github.com/OODemi52/extents.git
    ```
2.  Navigate to the project directory
    ```sh
    cd extents
    ```
3.  Install NPM packages
    ```sh
    npm install
    ```

### Running the Application

To run the application in development mode (with hot-reloading), use the Tauri CLI:

```sh
npm run tauri dev
```

This command will build both the Rust backend and the frontend, and launch the desktop application.

---

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request:

```
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/new-feature`)
3.  Commit your Changes (`git commit -m 'Add some new-feature'`)
4.  Push to the Branch (`git push origin feature/new-feature`)
5.  Open a Pull Request
```

If you would like to simply request a feature, for now you can open an issue with the "Enhancement" tag, and if it aligns with the vision for the application, we will try to get to it!

Give this project a star if you are interested in it!


---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
