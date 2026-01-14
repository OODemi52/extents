## Extents - v${version}

<div align="center">
<b><u>Quick Downloads</u></b>

${asset_table}
</div>

---

### Running Extents for the First Time

Because **Extents is not yet code-signed/notarized**, your operating system may display security warnings the first time you try to open it. This is expected, and you can follow the steps below for your operating system to run the application successfully.

<details>
<summary><b>macOS Instructions</b></summary>

On macOS, the OS may incorrectly report that the application is **“damaged”** or **“can’t be opened."**

1.  **Install Extents** by dragging **`Extents.app`** into your **`/Applications`** folder.
2.  **Open the Terminal** app (you can find it in `/Applications/Utilities` or search with Spotlight).
3.  **Run the following command** to remove the quarantine flag that macOS adds to downloaded apps:
    ```sh
    xattr -dr com.apple.quarantine /Applications/Extents.app
    ```
4.  You should now be able to launch Extents sucessfully.
*(Optional) To verify the quarantine flag was removed, run*
    ```sh
    xattr /Applications/Extents.app
    ```
*The command should produce no output, confirming the flag is gone.*

</details>

---

<details>
<summary><b>Windows Instructions</b></summary>

On Windows, when you first launch the application, you may see a blue **"Windows protected your PC"** screen from Windows Defender SmartScreen.

1.  Click **"More info"**.
2.  A new button, **"Run anyway"**, will appear. Click it to start Extents.

</details>

---

<details>
<summary><b>Linux Instructions</b></summary>

On most Linux distributions, you can run the application directly.

1.  Download the **`.AppImage`** file.
2.  Make the file executable. In your terminal, run:
    ```sh
    chmod +x Extents*.AppImage
    ```
3.  Run the application:
    ```sh
    ./Extents*.AppImage
    ```
</details>
