<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ScopeDataAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $scope = [];

        if ($user->isAdmin()) {
            $scope['type'] = 'all';
        } elseif ($user->isLgaCoordinator()) {
            $scope['type'] = 'lga';
            $scope['lga_id'] = $user->managedLgaId();
        } elseif ($user->isWardCoordinator()) {
            $scope['type'] = 'ward';
            $scope['ward_id'] = $user->managedWardId();
        } elseif ($user->isAgent()) {
            $scope['type'] = 'agent';
            $scope['polling_unit_id'] = $user->assignedPollingUnitId();
            $scope['registered_by'] = $user->id;
        }

        $request->attributes->set('data_scope', $scope);

        return $next($request);
    }
}
