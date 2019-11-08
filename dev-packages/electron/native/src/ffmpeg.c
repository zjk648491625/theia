/********************************************************************************
 * Copyright (C) 2019 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

/**
 * https://nodejs.org/docs/latest-v10.x/api/n-api.html#n_api_n_api
 */
#include <node_api.h>

#include <string.h>

#include "ffmpeg.h"

static char *error_invalid_arguments = "invalid arguments";
static char *error_invalid_string_argument = "invalid string argument";

/**
 * Opens the ffmpeg library using path from JS function, signature must be:
 * `func(path: string)`
 */
char *open_ffmpeg_lib(struct FFMPEG_Library *ffmpeg, napi_env env, napi_callback_info info)
{
    // We will reuse this `status` for all napi calls.
    napi_status status;
    char *error = NULL;

    // Get arguments.
    size_t argc = 1;
    napi_value argv[1];
    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    if (status != napi_ok || argc < 1)
    {
        error = error_invalid_arguments;
        goto error;
    }

    // Get first argument as string.
    char path[2048];
    status = napi_get_value_string_utf8(env, argv[0], path, 2048, NULL);
    if (status != napi_ok)
    {
        error = error_invalid_string_argument;
        goto error;
    }

    // Load ffmpeg based on the provided path.
    error = load_ffmpeg_library(ffmpeg, path);
    if (error != NULL)
    {
        goto error;
    }

error:
    return error;
}

/**
 * Return the list of codecs registered in the FFMPEG library.
 */
napi_value codecs(napi_env env, napi_callback_info info)
{
    // We will reuse this `status` for all napi calls.
    napi_status status;
    char *error = NULL;

    // Load the ffmpeg library according to provided path:
    struct FFMPEG_Library ffmpeg = NULL_FFMPEG_LIBRARY;
    error = open_ffmpeg_lib(&ffmpeg, env, info);
    if (error != NULL)
    {
        goto error;
    }

    // Create the JavaScript list that will be returned.
    napi_value codecs;
    status = napi_create_array(env, &codecs);
    if (status != napi_ok)
    {
        error = "napi_create_array fail";
        goto error;
    }

    // Iterate over the codec descriptions.
    // It includes descriptions for codecs that may not be present in the
    // library.
    void *iterator = NULL;
    const struct AVCodec *codec = ffmpeg.av_codec_iterate(&iterator);
    while (codec != NULL)
    {

        // Create the codec object and assign the properties.
        napi_value object, value;
        napi_create_object(env, &object);

        // id: number
        napi_create_int32(env, codec->id, &value);
        napi_set_named_property(env, object, "id", value);

        // name: string
        napi_create_string_utf8(env, codec->name, strlen(codec->name), &value);
        napi_set_named_property(env, object, "name", value);

        // longName: string
        napi_create_string_utf8(env, codec->long_name, strlen(codec->long_name), &value);
        napi_set_named_property(env, object, "longName", value);

        // Pushing into a JS array requires calling the JS method for that.
        napi_value push_fn;
        napi_get_named_property(env, codecs, "push", &push_fn);
        napi_call_function(env, codecs, push_fn, 1, (napi_value[]){object}, NULL);

        codec = ffmpeg.av_codec_iterate(&iterator);
    }

    // Free the ffmpeg library.
    error = unload_ffmpeg_library(&ffmpeg);
    if (error != NULL)
    {
        goto error;
    }

    return codecs;

error:
    if (error != NULL)
    {
        napi_throw_error(env, NULL, error);
    }
    return NULL;
}

/**
 * Return the list of filters registered in the FFMPEG library.
 */
napi_value filters(napi_env env, napi_callback_info info)
{
    // We will reuse this `status` for all napi calls.
    napi_status status;
    char *error = NULL;

    // Load the ffmpeg library according to provided path:
    struct FFMPEG_Library ffmpeg = NULL_FFMPEG_LIBRARY;
    error = open_ffmpeg_lib(&ffmpeg, env, info);
    if (error != NULL)
    {
        return NULL;
    }

    // Create the JavaScript list that will be returned.
    napi_value filters;
    status = napi_create_array(env, &filters);
    if (status != napi_ok)
    {
        error = "napi_create_array fail";
        goto error;
    }

    // Iterate over the filter descriptions.
    // It includes descriptions for filters that may not be present in the
    // library.
    void *iterator = NULL;
    const struct AVBitStreamFilter *filter = ffmpeg.av_bsf_iterate(&iterator);
    while (filter != NULL)
    {
        // Create the filter object and assign the properties.
        napi_value object, value;
        napi_create_object(env, &object);

        // name: string
        napi_create_string_utf8(env, filter->name, strlen(filter->name), &value);
        napi_set_named_property(env, object, "name", value);

        // Pushing into a JS array requires calling the JS method for that.
        napi_value push_fn;
        napi_get_named_property(env, filters, "push", &push_fn);
        napi_call_function(env, filters, push_fn, 1, (napi_value[]){object}, NULL);

        filter = ffmpeg.av_bsf_iterate(&iterator);
    }

    // Free the ffmpeg library.
    error = unload_ffmpeg_library(&ffmpeg);
    if (error != NULL)
    {
        goto error;
    }

    return filters;

error:
    if (error != NULL)
    {
        napi_throw_error(env, NULL, error);
    }
    return NULL;
}

/**
 * https://nodejs.org/docs/latest-v10.x/api/n-api.html#n_api_module_registration
 */
napi_value initialize(napi_env env, napi_value exports)
{
    napi_status status;
    napi_value function_codecs;
    napi_value function_filters;

    status = napi_create_function(env, NULL, 0, codecs, NULL, &function_codecs);
    if (status != napi_ok)
    {
        return NULL;
    }

    status = napi_create_function(env, NULL, 0, filters, NULL, &function_filters);
    if (status != napi_ok)
    {
        return NULL;
    }

    status = napi_set_named_property(env, exports, "codecs", function_codecs);
    if (status != napi_ok)
    {
        return NULL;
    }

    status = napi_set_named_property(env, exports, "filters", function_filters);
    if (status != napi_ok)
    {
        return NULL;
    }

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, initialize);
