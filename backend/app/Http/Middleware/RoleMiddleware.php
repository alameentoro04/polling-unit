<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, string $role): Response
    {
        $user = auth()->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $allowedRoles = explode('|', $role);

        if (!in_array($user->role?->name, $allowedRoles)) {
            return response()->json(['message' => 'Forbidden: insufficient permissions'], 403);
        }

        return $next($request);
    }
}
