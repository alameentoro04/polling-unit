<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAgentScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user || !$user->isAgent()) {
            return $next($request);
        }

        $assignedPuId = $user->assignedPollingUnitId();

        if (!$assignedPuId) {
            return response()->json(['message' => 'Agent has no assigned polling unit'], 403);
        }

        // Attach agent scope to request for controllers to use
        $request->attributes->set('agent_polling_unit_id', $assignedPuId);
        $request->attributes->set('agent_ward_id', $user->currentAssignment()?->pollingUnit?->ward_id);
        $request->attributes->set('agent_lga_id', $user->currentAssignment()?->pollingUnit?->ward?->lga_id);

        return $next($request);
    }
}
