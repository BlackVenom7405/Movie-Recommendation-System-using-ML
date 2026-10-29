"""
CineMatch - Intelligent Content-Based Movie Recommendation System
Main execution entry point for local server and college project evaluation.
"""
import os
from app import app

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"\n==================================================================")
    print(f"🎬 CineMatch ML Recommendation Engine")
    print(f"🌐 Access Website: http://127.0.0.1:{port}")
    print(f"==================================================================\n")
    app.run(host='0.0.0.0', port=port, debug=False)
