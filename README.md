# Reframe - AI-Powered Image Transformation Tool

Transform your photos into amazing cartoons using cutting-edge AI technology with OpenCV fallback! Reframe features a beautiful modern web interface with pink gradient themes and uses advanced machine learning models for the best results, but automatically falls back to robust OpenCV techniques when AI is unavailable.

## 🚀 Features

- **Modern Web Interface**: Beautiful HTML/CSS frontend with pink gradient themes and soft glow effects
- **FastAPI Backend**: High-performance REST API with JWT authentication
- **Hybrid Processing**: AI-powered transformation with OpenCV fallback for reliability
- **Multiple Styles**: Classic Cartoon, Pencil Sketch, Watercolor Painting, and Oil Painting
- **Style Variants**: Multiple variations for each artistic style (OpenCV mode)
- **Automatic Fallback**: Seamlessly switches to OpenCV when AI is unavailable
- **User Authentication**: Secure JWT-based login and registration system
- **Responsive Design**: Works perfectly on desktop and mobile devices
- **Download Support**: Save your transformed images in high quality PNG format

## 🎨 Transformation Styles

1. **Classic Cartoon**: Traditional animated style with bold colors, clean lines, and simplified features
2. **Pencil Sketch**: Hand-drawn appearance with detailed line work, crosshatching, and realistic shading
3. **Watercolor Painting**: Soft, flowing colors with gentle brush strokes and dreamy atmospheric effects
4. **Oil Painting**: Rich, textured brush strokes with vibrant colors and classic painting techniques

## 🛠️ Installation

### Prerequisites

To use the AI-powered image transformation features, you need to set up a Hugging Face token.

### Setup Steps

1. **Clone the repository**:
```bash
git clone <repository-url>
cd toonify
```

2. **Install dependencies**:
```bash
pip install -r requirements.txt
```

3. **Get a Hugging Face Token**:
   - Go to [Hugging Face](https://huggingface.co/)
   - Create a free account or log in
   - Navigate to [Settings > Access Tokens](https://huggingface.co/settings/tokens)
   - Click "New token"
   - Give it a name (e.g., "Reframe App")
   - Select "Read" permissions
   - Click "Generate a token"
   - Copy the token (it starts with `hf_`)

4. **Create Environment File**:
   - In your project directory, create a file named `.env`
   - Add your token to the file:
   ```
   HF_TOKEN=hf_your_actual_token_here
   ```
   **Note**: Replace `hf_your_actual_token_here` with the actual token you copied from Hugging Face.

   #### Alternative: Set Environment Variable Manually

   If you prefer not to use a `.env` file, you can set the environment variable directly:

   **Windows (Command Prompt)**
   ```cmd
   set HF_TOKEN=your_token_here
   ```

   **Windows (PowerShell)**
   ```powershell
   $env:HF_TOKEN="your_token_here"
   ```

   **Linux/Mac**
   ```bash
   export HF_TOKEN=your_token_here
   ```

5. **Run the application**:
```bash
python run.py
```

Or using uvicorn directly:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

6. **Open your browser and navigate to**:
```
http://localhost:8000
```

## 📋 Requirements

- Python 3.7+
- Hugging Face account and API token
- Internet connection for AI processing
- See `requirements.txt` for Python dependencies

## 🔧 Configuration

The app requires a Hugging Face API token to access the AI models. Follow the detailed setup steps in the Installation section above to obtain and configure your token.

## 🎯 How It Works

1. **Upload**: Choose an image file (PNG, JPG, JPEG)
2. **Select Style**: Pick from 4 AI-powered transformation styles
3. **Generate**: Click "Apply Transformation" to process with AI
4. **Download**: Save your transformed image

## 🤖 Technology Stack

This application uses:
- **FastAPI**: High-performance Python web framework for the REST API
- **HTML/CSS/JavaScript**: Modern responsive frontend with pink gradient themes
- **Hugging Face Inference API**: For cloud-based AI processing (primary)
- **OpenCV**: For reliable image processing fallback with multiple style variants
- **Qwen/Qwen-Image-Edit Model**: Advanced image-to-image transformation
- **JWT Authentication**: Secure token-based user authentication
- **PIL/Pillow**: Image processing and handling
- **SQLite**: Lightweight database for user management

## 🔄 Fallback System

The app intelligently handles processing failures:
1. **Primary**: Attempts AI transformation using Hugging Face models
2. **Fallback**: Automatically uses OpenCV techniques if AI fails
3. **Reliability**: Ensures you always get a cartoon transformation

## 📁 Project Structure

```
reframe/
├── main.py                 # FastAPI application and API routes
├── run.py                  # Application runner script
├── auth.py                 # User authentication system (legacy)
├── toonify.py              # AI image transformation logic
├── opencv_fallback.py      # OpenCV image processing with variants
├── static/
│   ├── index.html          # Main HTML frontend
│   ├── style.css           # CSS with pink gradient themes
│   └── script.js           # JavaScript frontend logic
├── requirements.txt        # Python dependencies
├── setup_guide.md          # Setup instructions
└── README.md              # This file
```

## 🔒 Security

- Secure password hashing with bcrypt
- Session-based authentication
- Images processed securely via Hugging Face API
- No permanent storage of uploaded images

## 🚀 Performance

- AI processing typically takes 5-15 seconds per image
- Larger images may take longer to process
- Results depend on internet connection speed
- High-quality output suitable for printing or sharing

## 🔧 Troubleshooting

- **"HF_TOKEN environment variable is required"**: Make sure you've set the HF_TOKEN environment variable as described in the Installation section
- **Connection errors**: Check your internet connection
- **Processing failures**: Try with a smaller image or different style

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.

## 🤖 Model Information

This app uses the `Qwen/Qwen-Image-Edit` model via Hugging Face's Inference API for high-quality image-to-image transformations.