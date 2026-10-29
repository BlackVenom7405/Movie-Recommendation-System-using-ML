import os
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from engine import engine

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    """Serves the main single-page application."""
    return render_template('index.html')

@app.route('/api/genres', methods=['GET'])
def get_genres():
    """Returns the list of all available genres in the dataset."""
    return jsonify({
        "status": "success",
        "genres": ["All"] + engine.genres_list
    })

@app.route('/api/featured', methods=['GET'])
def get_featured():
    """Returns featured and trending iconic movies for the landing page."""
    featured = engine.get_featured_movies()
    return jsonify({
        "status": "success",
        "movies": featured
    })

@app.route('/api/search', methods=['GET'])
def search_movies():
    """
    Search and filter movies by title/actor/director, genre, and sorting.
    Query parameters:
      q: search string (optional)
      genre: genre filter name (optional)
      sort: 'popularity' | 'rating' | 'newest' | 'oldest' | 'title'
      page: integer page number (default: 1)
      per_page: items per page (default: 12)
    """
    q = request.args.get('q', '').strip()
    genre = request.args.get('genre', '').strip()
    sort_by = request.args.get('sort', 'popularity').strip()
    
    try:
        page = int(request.args.get('page', 1))
    except ValueError:
        page = 1
        
    try:
        per_page = int(request.args.get('per_page', 12))
    except ValueError:
        per_page = 12

    results = engine.search_movies(
        query=q,
        genre=genre,
        sort_by=sort_by,
        page=page,
        per_page=per_page
    )
    return jsonify({
        "status": "success",
        **results
    })

@app.route('/api/movie/<int:movie_id>', methods=['GET'])
def get_movie(movie_id):
    """Retrieves full metadata for a specific movie by TMDB movie_id."""
    movie = engine.get_movie_by_id(movie_id)
    if not movie:
        return jsonify({
            "status": "error",
            "message": f"Movie with ID {movie_id} was not found."
        }), 404

    return jsonify({
        "status": "success",
        "movie": movie
    })

@app.route('/api/recommend', methods=['POST'])
def recommend():
    """
    Generates content-based movie recommendations.
    Accepts JSON payload:
      { "query": "Inception" } or { "movie_id": 27205, "top_k": 6 }
    """
    data = request.get_json(silent=True) or {}
    query = data.get('query')
    movie_id = data.get('movie_id')
    
    try:
        top_k = int(data.get('top_k', 6))
    except (ValueError, TypeError):
        top_k = 6

    if not query and movie_id is None:
        return jsonify({
            "status": "error",
            "message": "Please provide either a movie title query or a movie_id."
        }), 400

    result = engine.get_recommendations(query=query, movie_id=movie_id, top_k=top_k)
    return jsonify(result)

@app.route('/api/model-info', methods=['GET'])
def model_info():
    """Returns technical metadata, vocabulary statistics, and architecture specs for academic review."""
    info = engine.get_model_info()
    return jsonify({
        "status": "success",
        "info": info
    })

@app.errorhandler(404)
def not_found(e):
    if request.path.startswith('/api/'):
        return jsonify({"status": "error", "message": "API endpoint not found."}), 404
    return render_template('index.html'), 200

@app.errorhandler(500)
def server_error(e):
    return jsonify({"status": "error", "message": "Internal server error occurred."}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    print(f"\n==================================================================")
    print(f"🎬 CineMatch Recommendation Server Running on http://127.0.0.1:{port}")
    print(f"==================================================================\n")
    app.run(host='0.0.0.0', port=port, debug=False)

