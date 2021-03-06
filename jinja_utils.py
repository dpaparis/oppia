# Copyright 2014 The Oppia Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Jinja-related utilities."""

import copy
import logging
import os
import math

import feconf
import jinja2
from jinja2 import meta
import json


_OPPIA_MODULE_DEFINITION_FILE = 'app.js'


class JinjaConfig(object):
    """Contains Jinja configuration properties."""

    def _js_string_filter(value):
        """Converts a value to a JSON string for use in JavaScript code."""
        string = json.dumps(value)

        replacements = [('\\', '\\\\'), ('"', '\\"'), ("'", "\\'"),
                        ('\n', '\\n'), ('\r', '\\r'), ('\b', '\\b'),
                        ('<', '\\u003c'), ('>', '\\u003e'), ('&', '\\u0026')]

        for replacement in replacements:
            string = string.replace(replacement[0], replacement[1])
        return jinja2.utils.Markup(string)

    def _log2_floor_filter(value):
        """Returns the logarithm base 2 of the given value, rounded down."""
        return int(math.log(value, 2))

    FILTERS = {
        'is_list': lambda x: isinstance(x, list),
        'is_dict': lambda x: isinstance(x, dict),
        'js_string': _js_string_filter,
        'log2_floor': _log2_floor_filter,
    }


def get_jinja_env(dir_path):
    loader = jinja2.FileSystemLoader(os.path.join(
        os.path.dirname(__file__), dir_path))
    env = jinja2.Environment(autoescape=True, loader=loader)

    skins_loader = jinja2.FileSystemLoader(os.path.join(
        os.path.dirname(__file__), feconf.SKINS_TEMPLATES_DIR))
    skins_env = jinja2.Environment(autoescape=True, loader=skins_loader)

    def include_js_file(filepath):
        """Include a raw JS file in the template without evaluating it."""
        assert filepath.endswith('.js')
        raw_file_contents = loader.get_source(env, filepath)[0]
        if filepath == _OPPIA_MODULE_DEFINITION_FILE:
            return jinja2.Markup(raw_file_contents)
        else:
            # Wrap the file in an immediately-invoked function expression
            # (IIFE) to prevent pollution of the global scope.
            return jinja2.Markup('(function() {%s})();' % raw_file_contents)

    def include_skins_js_file(name):
        """Include a raw JS file from extensions/skins in the template."""
        assert name.endswith('.js')
        return jinja2.Markup(skins_loader.get_source(skins_env, name)[0])

    env.globals['include_js_file'] = include_js_file
    env.globals['include_skins_js_file'] = include_skins_js_file
    env.filters.update(JinjaConfig.FILTERS)
    return env


def parse_string(string, params, autoescape=True):
    """Parses a string using Jinja templating.

    Args:
      string: the string to be parsed.
      params: the parameters to parse the string with.
      autoescape: whether to enable autoescaping when parsing.

    Returns:
      the parsed string, or None if the string could not be parsed.
    """
    env = jinja2.Environment(autoescape=autoescape)

    env.filters.update(JinjaConfig.FILTERS)
    try:
        parsed_string = env.parse(string)
    except Exception:
        raise Exception('Unable to parse string with Jinja: %s' % string)

    variables = meta.find_undeclared_variables(parsed_string)
    if any([var not in params for var in variables]):
        logging.info('Cannot parse %s fully using %s', string, params)

    try:
        return env.from_string(string).render(params)
    except Exception:
        logging.error(
            'jinja_utils.parse_string() failed with args: %s, %s, %s' %
            (string, params, autoescape))
        return env.from_string('[CONTENT PARSING ERROR]').render({})


def evaluate_object(obj, params):
    """Returns a copy of `obj` after parsing strings in it using `params`."""

    if isinstance(obj, basestring):
        return parse_string(obj, params)
    elif isinstance(obj, list):
        new_list = []
        for item in obj:
            new_list.append(evaluate_object(item, params))
        return new_list
    elif isinstance(obj, dict):
        new_dict = {}
        for key in obj:
            new_dict[key] = evaluate_object(obj[key], params)
        return new_dict
    else:
        return copy.deepcopy(obj)
