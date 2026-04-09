import os
import uuid

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from google.cloud import aiplatform
from google.cloud import storage
from google.api_core import exceptions as gcloud_exceptions
from vertexai.generative_models import GenerativeModel, Image as GenImage, Part
from vertexai.preview.vision_models import (
    Image,
    ImageGenerationModel,
    SubjectReferenceImage,
)

app = Flask(__name__)
CORS(app)


def load_env_file(path: str = ".env"):
    """Lightweight .env loader to avoid manual exports each run."""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            # Do not overwrite already-exported shell variables.
            os.environ.setdefault(key, value)


load_env_file(".env")

# 1. Configuration
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "YOUR_PROJECT_ID")
LOCATION = "us-central1"
aiplatform.init(project=PROJECT_ID, location=LOCATION)
MODEL_NAME = os.getenv("VERTEX_IMAGE_MODEL", "imagegeneration@006")
GEMINI_MODEL_NAME = os.getenv("VERTEX_GEMINI_MODEL", "gemini-1.5-pro")
GCS_BUCKET = os.getenv("GCS_BUCKET", "")
GCS_SIGNED_URL_MINUTES = int(os.getenv("GCS_SIGNED_URL_MINUTES", "120"))
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() in {"1", "true", "yes", "on"}
DEMO_RESULT_URL = os.getenv(
    "DEMO_RESULT_URL",
    "http://localhost:5000/static/demo-result.svg",
)
_model = None
_gemini_model = None
_storage_client = None
_INVALID_BUCKET_VALUES = {"", "your-bucket-name", "YOUR_BUCKET_NAME"}


def get_model():
    global _model
    if _model is None:
        _model = ImageGenerationModel.from_pretrained(MODEL_NAME)
    return _model


def get_gemini_model():
    global _gemini_model
    if _gemini_model is None:
        _gemini_model = GenerativeModel(GEMINI_MODEL_NAME)
    return _gemini_model


def get_storage_client():
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client(project=PROJECT_ID)
    return _storage_client


def upload_result_to_gcs(local_path: str, blob_name: str):
    client = get_storage_client()
    bucket = client.bucket(GCS_BUCKET)
    blob = bucket.blob(blob_name)
    blob.upload_from_filename(local_path, content_type="image/png")

    gcs_uri = f"gs://{GCS_BUCKET}/{blob_name}"
    signed_url = blob.generate_signed_url(
        version="v4",
        expiration=GCS_SIGNED_URL_MINUTES * 60,
        method="GET",
    )
    return gcs_uri, signed_url


def has_valid_gcs_bucket():
    return GCS_BUCKET not in _INVALID_BUCKET_VALUES


def quality_gate_check(person_path: str):
    """
    Returns:
      (True, "Ready") if image is suitable
      (False, "suggestion...") if user should upload a better image
    """
    prompt = (
        "Analyze this photo for saree virtual try-on readiness.\n"
        "Check: (1) person standing straight with arms slightly away from body, "
        "(2) background relatively simple, (3) clothing not bulky like winter jacket.\n"
        "If suitable, respond with exactly: Ready\n"
        "Otherwise, respond with one brief suggestion only."
    )
    model = get_gemini_model()
    response = model.generate_content(
        [prompt, Part.from_image(GenImage.load_from_file(person_path))]
    )
    text = (response.text or "").strip()
    if text.lower().startswith("ready"):
        return True, "Ready"
    if not text:
        return False, "Please upload a clearer full-body photo with simple background."
    return False, text


def demo_response(reason: str):
    return jsonify(
        {
            "result_url": DEMO_RESULT_URL,
            "quality_gate": "ready",
            "storage": "demo",
            "demo_mode": True,
            "warning": reason,
        }
    )


def ensure_demo_image():
    os.makedirs("static", exist_ok=True)
    demo_path = os.path.join("static", "demo-result.svg")
    if os.path.exists(demo_path):
        return
    svg = """<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1280" viewBox="0 0 1024 1280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1280" fill="url(#bg)"/>
  <circle cx="512" cy="430" r="140" fill="#fff" opacity="0.92"/>
  <rect x="340" y="560" width="344" height="470" rx="170" fill="#fff" opacity="0.92"/>
  <path d="M300 640 C420 560, 640 560, 740 680 L700 760 C620 680, 420 700, 340 800 Z" fill="#ea580c" opacity="0.92"/>
  <text x="512" y="1120" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="40" font-weight="700">Demo Result</text>
  <text x="512" y="1168" text-anchor="middle" fill="#111827" font-family="Arial, sans-serif" font-size="28">Enable billing for real AI generation</text>
</svg>
"""
    with open(demo_path, "w", encoding="utf-8") as f:
        f.write(svg)


@app.route("/")
def home():
    # Serve the local frontend page at the root URL.
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def serve_site_files(filename):
    # Serve root-level website assets/pages (css/js/html/images).
    if os.path.isfile(filename):
        return send_from_directory(".", filename)
    return jsonify({"error": "Not found"}), 404


@app.route("/try-on", methods=["POST"])
def try_on():
    person_path = None
    saree_path = None
    output_path = None
    try:
        print("[try-on] Request received", flush=True)
        if DEMO_MODE:
            print("[try-on] Demo mode enabled - returning sample image", flush=True)
            return demo_response(
                "Demo mode is enabled. Returning a sample image while backend AI is unavailable."
            )

        if PROJECT_ID == "YOUR_PROJECT_ID":
            return jsonify({"error": "Set GOOGLE_CLOUD_PROJECT before running."}), 400

        if "person_image" not in request.files or "saree_image" not in request.files:
            return jsonify(
                {"error": "Missing required files: person_image and saree_image"}
            ), 400

        person_file = request.files["person_image"]
        saree_file = request.files["saree_image"]

        # Generate unique filenames to avoid cache/collision issues
        job_id = str(uuid.uuid4())
        person_path = f"temp_person_{job_id}.png"
        saree_path = f"temp_saree_{job_id}.png"
        output_filename = f"result_{job_id}.png"
        output_path = f"temp_result_{job_id}.png"

        person_file.save(person_path)
        saree_file.save(saree_path)
        print("[try-on] Files saved", flush=True)

        # 2. Gemini quality gate to avoid expensive low-quality generation calls
        is_ready, quality_feedback = quality_gate_check(person_path)
        if not is_ready:
            print("[try-on] Quality gate retry", flush=True)
            return (
                jsonify(
                    {
                        "error": "Photo not ready for try-on.",
                        "quality_gate": "retry",
                        "suggestion": quality_feedback,
                    }
                ),
                422,
            )

        # 3. Convert to Vertex AI Image objects
        base_person = Image.load_from_file(person_path)
        garment = Image.load_from_file(saree_path)

        # 4. Model Prediction (saree-guided edit fallback using current SDK)
        model = get_model()
        reference_saree = SubjectReferenceImage(
            reference_id=1,
            image=garment,
            subject_type="product",
            subject_description="saree fabric and drape style",
        )
        prompt = (
            "Dress the person in the same saree from the reference image. "
            "Preserve the person's face and body pose. "
            "Create a realistic full-body fashion try-on result."
        )
        results = model.edit_image(
            prompt=prompt,
            base_image=base_person,
            reference_images=[reference_saree],
            edit_mode="product-image",
            output_mime_type="image/png",
            number_of_images=1,
        )
        print("[try-on] Model response received", flush=True)

        # 5. Save result
        results[0].save(output_path)

        if has_valid_gcs_bucket():
            gcs_blob_name = f"tryon-results/{output_filename}"
            gcs_uri, signed_url = upload_result_to_gcs(output_path, gcs_blob_name)
            print("[try-on] Uploaded to GCS", flush=True)
            return jsonify(
                {
                    "result_url": signed_url,
                    "gcs_uri": gcs_uri,
                    "bucket_path": gcs_blob_name,
                    "storage": "gcs",
                    "quality_gate": "ready",
                }
            )

        # Fallback to local static serving when GCS bucket is not configured yet.
        local_output_path = os.path.join("static", output_filename)
        os.replace(output_path, local_output_path)
        output_path = None
        print("[try-on] Saved locally", flush=True)
        return jsonify(
            {
                "result_url": f"http://localhost:5000/static/{output_filename}",
                "storage": "local",
                "quality_gate": "ready",
                "warning": "GCS_BUCKET is not configured; using local static storage.",
            }
        )

    except gcloud_exceptions.PermissionDenied as e:
        # Helpful fallback while billing/IAM is being fixed.
        print(f"[try-on] Permission error: {e}", flush=True)
        if DEMO_MODE:
            return demo_response(
                "Billing or IAM is not enabled yet. Returned demo image for frontend testing."
            )
        return (
            jsonify(
                {
                    "error": "Google Cloud permission/billing issue.",
                    "details": str(e),
                    "tip": "Enable billing on the project and verify Vertex AI + Storage permissions.",
                }
            ),
            403,
        )
    except Exception as e:
        print(f"[try-on] Error: {e}", flush=True)
        return jsonify({"error": str(e)}), 500
    finally:
        # Cleanup temporary input files
        if person_path and os.path.exists(person_path):
            os.remove(person_path)
        if saree_path and os.path.exists(saree_path):
            os.remove(saree_path)
        if output_path and os.path.exists(output_path):
            os.remove(output_path)


@app.route("/static/<filename>")
def serve_static(filename):
    # Serve generated images for frontend access.
    return send_from_directory("static", filename)


if __name__ == "__main__":
    os.makedirs("static", exist_ok=True)
    ensure_demo_image()
    app.run(port=5000, debug=True)
