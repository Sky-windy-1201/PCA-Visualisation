# Interactive PCA Learning Lab

An interactive web-based learning tool designed to help undergraduate computing students understand **Principal Component Analysis (PCA)** through visual exploration, projection, and reconstruction.

This project was created for **BT3017** with the goal of building a deeper understanding of PCA by turning abstract mathematical ideas into interactive and intuitive visual explanations. Instead of only reading formulas, users can explore how PCA works by observing the shape of a data cloud, the directions of maximum variance, the meaning of eigenvectors and eigenvalues, and the effect of keeping only the top principal components.

The website supports both **2D and 3D datasets** and is designed to function like a small PCA learning lab, where users can interact with the data and immediately see how the PCA results change.

---

## Features

- Interactive **2D and 3D data visualization**
- Adjustable dataset controls such as:
  - number of points
  - spread
  - correlation
  - noise level
  - dimensionality mode
- Visualization of:
  - original data
  - mean centering
  - covariance matrix
  - principal components
  - explained variance
  - projection and reconstruction
- Ability to choose how many **top principal components** to keep
- Dynamic explanation of why the top components are selected
- Reconstruction view to show **information loss**
- CSV upload support for 2 or 3 numeric columns
- Guided walkthrough mode for teaching and presentation

---

## Learning Goals

This project helps users understand:

- what PCA is doing geometrically
- why data must be centered before applying PCA
- how the covariance matrix relates to data spread
- what eigenvectors and eigenvalues mean in PCA
- why PCA keeps the components with the largest eigenvalues
- how projection creates a lower-dimensional representation
- how reconstruction reveals information loss after compression

---

## Tech Stack

- **HTML**
- **CSS**
- **JavaScript**
- **Plotly.js** for interactive 2D and 3D plots
- **MathJax** for mathematical notation

---

## Running the Website Locally

Before running the project, make sure you have a browser installed.  
Since this project is a frontend webpage, you usually do **not** need to install heavy tools unless you are using a local development environment.

### Option 1: Open directly in your browser
If the project only contains frontend files such as `index.html`, `style.css`, and `script.js`:

```bash
# 1. Clone the repository
git clone https://github.com/Sky-windy-1201/PCA-Visualisation

# 2. Move into the project folder
cd <project-folder-name>

# 3. Open index.html in your browser
