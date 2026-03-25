from fastapi import Request

def get_models(request: Request):
    """Dependency — pulls pre-loaded models from app.state.
    returns a tuple of (main_model, tiny_model).
    """
    main_model = getattr(request.app.state, "main_model", None)
    tiny_model = getattr(request.app.state, "tiny_model", None)

    if main_model is None or tiny_model is None:
        raise RuntimeError("Models not initialized — lifespan may not have run")

    return main_model, tiny_model