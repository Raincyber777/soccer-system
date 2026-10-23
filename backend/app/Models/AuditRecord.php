<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditRecord extends Model
{
    protected $table = 'audit_records';

    protected $fillable = [
        'auditable_type', 'auditable_id', 'registration_id',
        'from_status', 'to_status', 'action', 'reason',
        'auditor_id', 'auditor_name', 'audit_level',
    ];

    protected $casts = [
        'auditable_id'     => 'integer',
        'registration_id'  => 'integer',
        'from_status'      => 'integer',
        'to_status'        => 'integer',
        'auditor_id'       => 'integer',
        'audit_level'      => 'integer',
    ];

    public function registration(): BelongsTo
    {
        return $this->belongsTo(Registration::class, 'registration_id');
    }
}
