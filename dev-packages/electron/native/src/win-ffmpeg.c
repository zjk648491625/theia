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
#ifndef WIN_FFMPEG
#define WIN_FFMPEG

#include <windows.h>

#include "ffmpeg.h"

static char *error_library_not_found = "shared library not found";
static char *error_function_not_found = "function not found in shared library";
static char *error_cannot_free_library = "cannot free shared library";

char *load_ffmpeg_library(struct FFMPEG_Library *library, char *library_path)
{
    char *error = NULL;

    HMODULE handle = LoadLibrary(library_path);
    if (!handle)
    {
        error = error_library_not_found;
        goto error;
    }

    const struct AVCodec *(*av_codec_iterate)(void **) = (const struct AVCodec *(*)(void **))
        GetProcAddress(handle, "av_codec_iterate");
    if (av_codec_iterate == NULL)
    {
        error = error_function_not_found
        goto error;
    }


    const struct AVBitStreamFilter *(*av_bsf_iterate)(void **) = (const struct AVBitStreamFilter *(*)(void **))
        GetProcAddress(handle, "av_bsf_iterate");
    if (av_bsf_iterate == NULL)
    {
        error = error_function_not_found
        goto error;
    }

    library->handle = handle;
    library->avcodec_descriptor_next = av_codec_next;
    library->avcodec_find_decoder = avcodec_find_decoder;
    return NULL;

error:
    if (handle)
    {
        FreeLibrary(handle);
    }
    return error;
}

char *unload_ffmpeg_library(struct FFMPEG_Library *library)
{
    if (library->handle && FreeLibrary(library->handle))
    {
        *library = NULL_FFMPEG_LIBRARY;
        return NULL;
    }
    return error_cannot_free_library;
}

#endif // WIN_FFMPEG guard
