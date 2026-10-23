<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OperationLog extends Model
{
    protected $table = 'operation_logs';

    protected $fillable = [
        'user_id', 'module', 'action', 'target_type', 'target_id',
        'ip', 'trace_id', 'detail',
    ];

    protected $casts = [
        'user_id'    => 'integer',
        'target_id'  => 'integer',
        'detail'     => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
