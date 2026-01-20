"""Logging utilities."""

import logging
from config import LOG_LEVEL

logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, LOG_LEVEL.upper(), logging.INFO))
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)
