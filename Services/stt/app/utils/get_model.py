from fastapi import Request

def get_models(request: Request):
    """Dependency — pulls pre-loaded models from app.state.
    returns a tuple of (main_model, tiny_model).
    """
    return request.app.state.main_model, request.app.state.tiny_model