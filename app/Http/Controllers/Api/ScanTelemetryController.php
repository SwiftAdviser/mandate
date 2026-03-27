<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScanEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScanTelemetryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'filesScanned' => 'required|integer|min:0|max:100000',
            'unprotected' => 'required|integer|min:0|max:100000',
        ]);

        ScanEvent::create([
            'files_scanned' => $data['filesScanned'],
            'unprotected' => $data['unprotected'],
            'ip' => $request->ip(),
        ]);

        return response()->json(['ok' => true]);
    }
}
