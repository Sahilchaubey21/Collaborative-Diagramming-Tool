
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
import os
from dotenv import load_dotenv
import requests

router = APIRouter()
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

@router.post("/ai/predict-shape")
async def predict_shape(data: dict = Body(...)):
    import logging
    logging.basicConfig(level=logging.INFO)
    logging.info(f"Received shape prediction request: {data}")
    points = data.get('points', [])
    if not points or len(points) < 2:
        return {"shape": None}
    # Simple heuristic: if start and end are close, and enough points, it's a circle
    start, end = points[0], points[-1]
    dx, dy = end['x'] - start['x'], end['y'] - start['y']
    dist = (dx**2 + dy**2) ** 0.5
    if dist < 20 and len(points) > 10:
        # Return a perfect circle (bounding box)
        xs = [p['x'] for p in points]
        ys = [p['y'] for p in points]
        minx, maxx = min(xs), max(xs)
        miny, maxy = min(ys), max(ys)
        cx, cy = (minx + maxx) / 2, (miny + maxy) / 2
        r = max(maxx - minx, maxy - miny) / 2
        return {"shape": {"tool": "circle", "center": {"x": cx, "y": cy}, "radius": r, "color": "#4b8", "width": 3}}
    # If roughly a straight line
    if len(points) >= 2:
        # Fit a line: if all points are close to the line between first and last
        x0, y0 = start['x'], start['y']
        x1, y1 = end['x'], end['y']
        def point_line_dist(px, py):
            num = abs((y1 - y0)*px - (x1 - x0)*py + x1*y0 - y1*x0)
            den = ((y1 - y0)**2 + (x1 - x0)**2) ** 0.5
            return num / den if den else 0
        if all(point_line_dist(p['x'], p['y']) < 10 for p in points):
            return {"shape": {"tool": "line", "points": [start, end], "color": "#4b8", "width": 3}}
    # Otherwise, rectangle (bounding box)
    xs = [p['x'] for p in points]
    ys = [p['y'] for p in points]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    return {"shape": {"tool": "rect", "points": [{"x": minx, "y": miny}, {"x": maxx, "y": maxy}], "color": "#4b8", "width": 3}}

@router.post("/ai/clean-diagram/")
async def clean_diagram(file: UploadFile = File(...)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured.")
    # Read image bytes
    image_bytes = await file.read()
    # Example Gemini API call (replace with actual endpoint and payload as needed)
    headers = {"Authorization": f"Bearer {GEMINI_API_KEY}"}
    files = {"file": (file.filename, image_bytes)}
    # This is a placeholder URL and payload for Gemini API
    response = requests.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:analyzeDiagram",
        headers=headers,
        files=files
    )
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Gemini API error: " + response.text)
    return response.json()
